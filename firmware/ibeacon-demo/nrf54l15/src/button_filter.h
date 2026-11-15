#ifndef WAYPOINT_BUTTON_FILTER_H
#define WAYPOINT_BUTTON_FILTER_H
#include <stdbool.h>
#include <stdint.h>
struct button_filter {
    uint8_t raw, stable;
    int64_t changed_at;
    bool armed;
};
/* Poll at 20 ms. One event per press; chords require release and are ignored. */
static inline uint8_t button_filter_update(struct button_filter *b, uint8_t raw, int64_t now)
{
    if (raw != b->raw) { b->raw = raw; b->changed_at = now; }
    if (now - b->changed_at < 40) { return 0; }
    if (raw == 0) { b->stable = 0; b->armed = true; return 0; }
    if (raw == b->stable) { return 0; }
    b->stable = raw;
    bool armed = b->armed;
    b->armed = false;
    return armed && !(raw & (raw - 1U)) ? raw : 0;
}
#endif
