#include <zephyr/kernel.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/drivers/pwm.h>
#include <zephyr/sys/atomic.h>
#include <zephyr/sys/printk.h>
#include <math.h>
#include <string.h>
#include "beacon.h"
#include "proximity.h"
#include "button_filter.h"
#include "game.h"
#include "oled.h"

#define BEEP_ON_MS 60
#define BEEP_PERIOD PWM_HZ(2000)

static const struct gpio_dt_spec buttons[] = {
    GPIO_DT_SPEC_GET(DT_ALIAS(sw2), gpios), /* A = Button 2 */
    GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios), /* B = Button 0 */
    GPIO_DT_SPEC_GET(DT_ALIAS(sw3), gpios), /* C = Button 3 */
    GPIO_DT_SPEC_GET(DT_ALIAS(sw1), gpios), /* D = Button 1 */
};
static const struct pwm_dt_spec buzzer = PWM_DT_SPEC_GET(DT_ALIAS(buzzer));
K_MUTEX_DEFINE(receiver_lock);
static struct proximity received;
static size_t receiver_target;
static atomic_t display_ready;
static atomic_t displayed_revision;
K_MSGQ_DEFINE(display_queue, sizeof(struct display_frame), 1, 4);

/* The display has its own thread: I2C transfers cannot delay button polling
 * or stretch beep timing. Only this thread owns the OLED framebuffer/bus. */
static void display_loop(void *a, void *b, void *c)
{
    ARG_UNUSED(a); ARG_UNUSED(b); ARG_UNUSED(c);
    struct display_frame view;
    int64_t retry_at = 0;
    for (;;) {
        k_msgq_get(&display_queue, &view, K_FOREVER);
        if (!atomic_get(&display_ready)) {
            if (k_uptime_get() < retry_at) { continue; }
            int err = oled_init();
            if (err) {
                printk("OLED unavailable (%d); check P1.11/P1.12 and 3.3 V\n", err);
                retry_at = k_uptime_get() + 5000;
                continue;
            }
            atomic_set(&display_ready, 1);
        }
        int err = oled_render(&view);
        if (err) {
            printk("OLED write failed: %d\n", err);
            atomic_clear(&display_ready);
            retry_at = k_uptime_get() + 5000;
        } else {
            atomic_set(&displayed_revision, view.revision);
        }
    }
}
K_THREAD_DEFINE(oled_thread, 2048, display_loop, NULL, NULL, NULL, 7, 0, 0);

static bool parse_field(struct bt_data *data, void *user_data)
{
    if (data->type != BT_DATA_MANUFACTURER_DATA) { return true; }
    struct beacon_identity id;
    if (!beacon_decode(data->data, data->data_len, &id)) { return true; }
    k_mutex_lock(&receiver_lock, K_FOREVER);
    bool matches = receiver_target < route_count &&
                   waypoint_matches(&route[receiver_target], &id);
    if (matches) {
        proximity_update(&received, *(int8_t *)user_data, id.power_at_1m, k_uptime_get());
    }
    k_mutex_unlock(&receiver_lock);
    return !matches;
}

static void device_found(const bt_addr_le_t *addr, int8_t rssi,
                         uint8_t adv_type, struct net_buf_simple *ad)
{
    ARG_UNUSED(addr);
    if (adv_type == BT_GAP_ADV_TYPE_ADV_NONCONN_IND) {
        bt_data_parse(ad, parse_field, &rssi);
    }
}

static void select_target(size_t target)
{
    k_mutex_lock(&receiver_lock, K_FOREVER);
    receiver_target = target;
    memset(&received, 0, sizeof(received));
    k_mutex_unlock(&receiver_lock);
    if (target < route_count) {
        printk("Target %u/%u: %s, major=%u minor=%u\n", (unsigned)target + 1,
               (unsigned)route_count, route[target].label, route[target].major,
               route[target].minor);
    }
}

static int read_buttons(uint8_t *mask)
{
    *mask = 0;
    for (unsigned i = 0; i < ARRAY_SIZE(buttons); ++i) {
        int active = gpio_pin_get_dt(&buttons[i]);
        if (active < 0) { return active; }
        if (active) { *mask |= 1U << i; }
    }
    return 0;
}

static void make_view(struct display_frame *v, const struct game *g,
                      const struct observation *o, int64_t now)
{
    memset(v, 0, sizeof(*v));
    v->state = g->state;
    v->audio_enabled = g->audio_enabled;
    snprintk(v->progress, sizeof(v->progress), "%u/%u",
             (unsigned)MIN(g->target + 1, g->count), (unsigned)g->count);
    const struct waypoint *w = g->target < g->count ? &g->waypoints[g->target] : NULL;
    snprintk(v->label, sizeof(v->label), "%s", w ? w->label : "JELLING");
    if (g->state == WELCOME) {
        snprintk(v->label, sizeof(v->label), "JELLING");
        snprintk(v->progress, sizeof(v->progress), "0/%u", (unsigned)g->count);
        snprintk(v->status, sizeof(v->status), "WELCOME");
        snprintk(v->detail, sizeof(v->detail), "%s",
                 g->audio_enabled ? "AUDIO - ON" : "AUDIO - OFF");
    } else if (g->state == NAVIGATING) {
        const char *names[] = {"SEARCHING", "FAR", "NEAR", "CLOSE"};
        snprintk(v->status, sizeof(v->status), "%s", names[g->band]);
        v->search_position = (now / 200) % 10;
        if (g->band == SEARCHING) {
            snprintk(v->detail, sizeof(v->detail), "%s",
                     o->fresh ? "ACQUIRING SIGNAL" : "FINDING BEACON...");
        } else {
            unsigned cm = MIN((unsigned)(MIN(o->metres, 999.99f) * 100.0f), 99999U);
            if (g->touch_ready) {
                snprintk(v->detail, sizeof(v->detail), "EST %u.%02uM D TOUCH",
                         cm / 100U, cm % 100U);
            } else {
                snprintk(v->detail, sizeof(v->detail), "EST %u.%02uM",
                         cm / 100U, cm % 100U);
            }
            v->bars = g->band == CLOSE ? 10 : g->band == NEAR ? 6 : 2;
        }
    } else if (g->state == QUESTION) {
        for (unsigned i = 0; i < 2; ++i) {
            snprintk(v->question[i], sizeof(v->question[i]), "%s", w->question[i]);
        }
        for (unsigned i = 0; i < 4; ++i) {
            snprintk(v->answers[i], sizeof(v->answers[i]), "%s", w->answers[i]);
        }
    } else if (g->state == ANSWER_RIGHT || g->state == ANSWER_WRONG) {
        bool correct = g->state == ANSWER_RIGHT;
        snprintk(v->status, sizeof(v->status), "%s", correct ? "CORRECT" : "WRONG");
        snprintk(v->detail, sizeof(v->detail), "%c - %s", 'A' + g->selected_answer,
                 correct ? "NEXT WAYPOINT" : "TRY AGAIN");
        v->bars = correct ? 10 : 0;
    } else if (g->state == ROUTE_COMPLETE) {
        snprintk(v->status, sizeof(v->status), "ALL DONE");
        snprintk(v->detail, sizeof(v->detail), "ROUTE COMPLETE");
        v->bars = 10;
    } else {
        snprintk(v->status, sizeof(v->status), "CONFIG");
        snprintk(v->detail, sizeof(v->detail), "CHECK ROUTE SETTINGS");
    }
}

/* Nonblocking tone scheduler: 60 ms fixed-pitch bursts with a band-based gap. */
static int update_buzzer(int gap, int64_t now)
{
    static bool sounding;
    static int previous_gap = -1;
    static int64_t deadline;
    int err;
    if (gap != previous_gap) {
        err = pwm_set_dt(&buzzer, BEEP_PERIOD, 0);
        if (err) { return err; }
        sounding = false;
        previous_gap = gap;
        deadline = now;
    }
    if (gap < 0 || now < deadline) { return 0; }
    sounding = !sounding;
    err = pwm_set_dt(&buzzer, BEEP_PERIOD, sounding ? BEEP_PERIOD / 2U : 0);
    deadline = now + (sounding ? BEEP_ON_MS : gap);
    return err;
}

int main(void)
{
    struct game game;
    struct button_filter filter = {0};
    game_init(&game, route, route_count);
    if (!pwm_is_ready_dt(&buzzer) || pwm_set_dt(&buzzer, BEEP_PERIOD, 0)) {
        printk("Buzzer initialization failed\n");
        return 0;
    }
    for (unsigned i = 0; i < ARRAY_SIZE(buttons); ++i) {
        if (!gpio_is_ready_dt(&buttons[i]) ||
            gpio_pin_configure_dt(&buttons[i], GPIO_INPUT)) {
            printk("Button %u initialization failed\n", i);
            return 0;
        }
    }
    if (game.state != CONFIG_ERROR) {
        select_target(0);
        int err = bt_enable(NULL);
        if (err) { printk("Bluetooth initialization failed: %d\n", err); return 0; }
        const struct bt_le_scan_param scan = {
            .type = BT_LE_SCAN_TYPE_PASSIVE, .options = BT_LE_SCAN_OPT_NONE,
            .interval = 0x00a0, .window = 0x00a0,
        };
        err = bt_le_scan_start(&scan, device_found);
        if (err) { printk("Scan start failed: %d\n", err); return 0; }
    }
    printk("Live waypoint game. B2=A, B0=B, B3=C, B1=D.\n");
    int64_t next_display = 0, next_log = 0;
    enum game_state previous_state = CONFIG_ERROR;
    enum proximity_band previous_band = SEARCHING;
    bool previous_audio = game.audio_enabled;
    uint32_t feedback_revision = 1;
    for (;;) {
        int64_t now = k_uptime_get();
        struct proximity p;
        k_mutex_lock(&receiver_lock, K_FOREVER);
        p = received;
        k_mutex_unlock(&receiver_lock);
        struct observation o = {
            .fresh = proximity_fresh(&p, now),
            .touch_fresh = proximity_fresh(&p, now) && now - p.last_seen_ms <= 1000,
            .samples = p.samples,
        };
        if (o.fresh && game.target < game.count) {
            o.metres = powf(10.0f, (p.power_at_1m - p.filtered_rssi) /
                           (10.0f * game.waypoints[game.target].path_loss_exponent));
        }
        uint8_t raw;
        int err = read_buttons(&raw);
        if (err) {
            (void)pwm_set_dt(&buzzer, BEEP_PERIOD, 0);
            printk("Button read failed: %d\n", err);
            return 0;
        }
        uint8_t pressed = button_filter_update(&filter, raw, now);
        size_t old_target = game.target;
        bool screen_current = atomic_get(&display_ready) &&
                              (uint32_t)atomic_get(&displayed_revision) == feedback_revision;
        game_step(&game, &o, screen_current ? pressed : 0, now);
        if (game.target != old_target) {
            select_target(game.target);
            memset(&o, 0, sizeof(o));
        }
        bool feedback_changed = game.state != previous_state || game.band != previous_band ||
                                game.audio_enabled != previous_audio;
        if (feedback_changed) { ++feedback_revision; }
        screen_current = atomic_get(&display_ready) &&
                         (uint32_t)atomic_get(&displayed_revision) == feedback_revision;
        /* Start a new cadence only after its matching OLED frame is on screen. */
        err = update_buzzer(screen_current ? game_beep_gap_ms(&game) : -1, now);
        if (err) {
            (void)pwm_set_dt(&buzzer, BEEP_PERIOD, 0);
            printk("Buzzer failed: %d\n", err);
            return 0;
        }
        if (now >= next_display || feedback_changed) {
            struct display_frame view;
            make_view(&view, &game, &o, now);
            view.revision = feedback_revision;
            /* Coalesce updates: never block the 20 ms input/tone loop. */
            while (k_msgq_put(&display_queue, &view, K_NO_WAIT)) { k_msgq_purge(&display_queue); }
            next_display = now + 200;
        }
        if (game.state != previous_state || now >= next_log) {
            printk("state=%d target=%u band=%d ready=%d RSSI=%.1f estimated=%.2fm fresh=%d\n",
                   game.state, (unsigned)game.target + 1, game.band, game.touch_ready,
                   (double)p.filtered_rssi, (double)o.metres, o.fresh);
            next_log = now + 2000;
        }
        previous_state = game.state;
        previous_band = game.band;
        previous_audio = game.audio_enabled;
        k_msleep(20);
    }
}
