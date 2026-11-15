#include "route.h"
#include <math.h>
#include <string.h>

/* Ordered route: IDs match our ESP32-C3 beacon minors (1..7).
 * Add or reorder entries here; route_count is derived automatically. */
const struct waypoint route[] = {
    {
        .label = "STATION 01", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 1,
        .question = {"HARALD BLUETOOTH", "BORN AROUND?"},
        .answers = {"810 AD", "910 AD", "1066 AD", "1200 AD"},
        .correct_answer = 1, .path_loss_exponent = 2.0f,
    },
    {
        .label = "STATION 02", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 2,
        .question = {"PAGAN VIKING BURIAL", "MOST COMMON WAY?"},
        .answers = {"CREMATED", "CHURCHES", "CAVES", "SEA SHIP"},
        .correct_answer = 0, .path_loss_exponent = 2.0f,
    },
    {
        .label = "STATION 03", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 3,
        .question = {"HARALDS BIGGEST", "RING FORTRESS?"},
        .answers = {"TRELBORG", "FYRKAT", "NONNEBKN", "AGGERSBG"},
        .correct_answer = 3, .path_loss_exponent = 2.0f,
    },
    {
        .label = "STATION 04", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 4,
        .question = {"HOW TO ENTER", "VALHALLA IN MYTH?"},
        .answers = {"OLD AGE", "BATTLE", "AT SEA", "ILLNESS"},
        .correct_answer = 1, .path_loss_exponent = 2.0f,
    },
    {
        .label = "STATION 05", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 5,
        .question = {"NAME OF GOD THORS", "MAGICAL HAMMER?"},
        .answers = {"GUNGNIR", "MJOLNIR", "GRAM", "DRAUPNIR"},
        .correct_answer = 1, .path_loss_exponent = 2.0f,
    },
    {
        .label = "STATION 06", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 6,
        .question = {"RAINBOW BRIDGE FROM", "MIDGARD TO ASGARD?"},
        .answers = {"YGGDRASL", "GJALLAR", "BIFROST", "FENRIR"},
        .correct_answer = 2, .path_loss_exponent = 2.0f,
    },
    {
        .label = "STATION 07", .uuid = BEACON_UUID_BYTES,
        .major = BEACON_MAJOR, .minor = 7,
        .question = {"FIRST RECORDED KING", "ON JELLING STONE?"},
        .answers = {"GORM", "HARALD", "SWEYN", "CANUTE"},
        .correct_answer = 0, .path_loss_exponent = 2.0f,
    },
};
const size_t route_count = sizeof(route) / sizeof(route[0]);

bool waypoint_matches(const struct waypoint *target, const struct beacon_identity *id)
{
    return !memcmp(target->uuid, id->uuid, 16) && target->major == id->major &&
           target->minor == id->minor;
}

static bool printable(const char *s, size_t limit)
{
    if (!s || !*s || strlen(s) > limit) { return false; }
    for (; *s; ++s) {
        if (!((*s >= 'A' && *s <= 'Z') || (*s >= '0' && *s <= '9') ||
              *s == ' ' || *s == '?' || *s == '-' || *s == '.')) { return false; }
    }
    return true;
}

bool route_valid(const struct waypoint *items, size_t count)
{
    if (!items || count < 1 || count > 9) { return false; }
    for (size_t i = 0; i < count; ++i) {
        const struct waypoint *w = &items[i];
        if (!printable(w->label, 14) || !printable(w->question[0], 20) ||
            !printable(w->question[1], 20) || w->correct_answer > 3 ||
            !isfinite(w->path_loss_exponent) || w->path_loss_exponent <= 0) {
            return false;
        }
        for (int a = 0; a < 4; ++a) {
            if (!printable(w->answers[a], 8)) { return false; }
        }
        for (size_t j = 0; j < i; ++j) {
            if (!memcmp(items[j].uuid, w->uuid, 16) && items[j].major == w->major &&
                items[j].minor == w->minor) { return false; }
        }
    }
    return true;
}
