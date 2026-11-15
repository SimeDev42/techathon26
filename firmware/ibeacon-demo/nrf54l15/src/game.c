#include "game.h"
#include <math.h>
#include <string.h>

#define BAND_DWELL_MS 500
#define CLOSE_DWELL_MS 1000
#define RESULT_MS 1500

static void reset_navigation(struct game *g)
{
    g->state = NAVIGATING;
    g->band = g->candidate = SEARCHING;
    g->close_since = -1;
    g->touch_ready = false;
}

void game_init(struct game *g, const struct waypoint *items, size_t count)
{
    memset(g, 0, sizeof(*g));
    g->waypoints = items;
    g->count = count;
    g->selected_answer = -1;
    g->audio_enabled = true;
    reset_navigation(g);
    g->state = route_valid(items, count) ? WELCOME : CONFIG_ERROR;
}

static enum proximity_band desired_band(enum proximity_band current, float m)
{
    /* Entry/exit thresholds differ to prevent chatter around boundaries. */
    if (current == CLOSE && m <= 1.8f) { return CLOSE; }
    if (m <= 1.5f) { return CLOSE; }
    if (current == FAR && m >= 4.5f) { return FAR; }
    if (current == NEAR && m <= 5.5f) { return NEAR; }
    return m >= 5.0f ? FAR : NEAR;
}

void game_step(struct game *g, const struct observation *o, uint8_t pressed, int64_t now)
{
    if (g->state == CONFIG_ERROR) { return; }
    if (g->state != QUESTION && pressed == 2U) {
        g->audio_enabled = !g->audio_enabled;
        return;
    }
    if (g->state == ROUTE_COMPLETE) { return; }
    if (g->state == WELCOME) {
        if (pressed == 1U) { reset_navigation(g); }
        return;
    }
    if (g->state == ANSWER_RIGHT || g->state == ANSWER_WRONG) {
        if (now < g->result_until) { return; }
        if (g->state == ANSWER_WRONG) { g->state = QUESTION; return; }
        if (++g->target == g->count) { g->state = ROUTE_COMPLETE; return; }
        reset_navigation(g);
        return; /* Never apply the old target's observation to the new target. */
    }
    if (g->state == QUESTION) {
        for (unsigned i = 0; i < 4; ++i) {
            if (pressed != (1U << i)) { continue; }
            g->selected_answer = (int)i;
            g->state = i == g->waypoints[g->target].correct_answer ?
                       ANSWER_RIGHT : ANSWER_WRONG;
            g->result_until = now + RESULT_MS;
            return;
        }
        return;
    }
    g->touch_ready = false;
    if (!o->fresh || o->samples < 5 || !isfinite(o->metres) || o->metres <= 0) {
        g->band = g->candidate = SEARCHING;
        g->close_since = -1;
        return;
    }
    enum proximity_band wanted = desired_band(g->band, o->metres);
    if (wanted != g->candidate) {
        g->candidate = wanted;
        g->candidate_since = now;
    }
    if (wanted != g->band && now - g->candidate_since >= BAND_DWELL_MS) {
        g->band = wanted;
    }
    /* Leaving the close region revokes eligibility immediately, even during dwell. */
    if (g->band != CLOSE || wanted != CLOSE || !o->touch_fresh) {
        g->close_since = -1;
    } else {
        if (g->close_since < 0) { g->close_since = now; }
        g->touch_ready = now - g->close_since >= CLOSE_DWELL_MS;
    }
    if (g->touch_ready && pressed == 8U) {
        g->state = QUESTION;
        g->touch_ready = false;
    }
}

int game_beep_gap_ms(const struct game *g)
{
    if (!g->audio_enabled || g->state != NAVIGATING) { return -1; }
    switch (g->band) {
    case FAR: return 1000;
    case NEAR: return 400;
    case CLOSE: return 100;
    default: return -1;
    }
}
