#ifndef TECHATHON_PROXIMITY_H
#define TECHATHON_PROXIMITY_H
#include <stdbool.h>
#include <stdint.h>
#include <math.h>

#define BEACON_LOST_MS 5000
#define RSSI_EMA_ALPHA 0.20f
#define PATH_LOSS_EXPONENT 2.0f /* Starting value only; tune in the venue. */

struct proximity {
    bool seen;
    int64_t last_seen_ms;
    float filtered_rssi;
    int8_t raw_rssi;
    int8_t power_at_1m;
    uint32_t samples;
};

static inline bool proximity_fresh(const struct proximity *p, int64_t now)
{
    return p->seen && now >= p->last_seen_ms &&
           now - p->last_seen_ms < BEACON_LOST_MS;
}

static inline void proximity_update(struct proximity *p, int8_t rssi,
                                    int8_t power, int64_t now)
{
    /* 127 means RSSI unavailable; reject invalid/nonnegative readings too. */
    if (rssi >= 0 || rssi < -126) {
        return;
    }
    if (!proximity_fresh(p, now)) {
        p->filtered_rssi = rssi;
        p->samples = 0;
    } else {
        p->filtered_rssi += RSSI_EMA_ALPHA * (rssi - p->filtered_rssi);
    }
    p->raw_rssi = rssi;
    p->power_at_1m = power;
    p->last_seen_ms = now;
    p->seen = true;
    if (p->samples != UINT32_MAX) {
        ++p->samples;
    }
}

/* Call only on a fresh snapshot. This is an RF model, not measured range. */
static inline float proximity_metres(const struct proximity *p)
{
    return powf(10.0f, (p->power_at_1m - p->filtered_rssi) /
                      (10.0f * PATH_LOSS_EXPONENT));
}
#endif
