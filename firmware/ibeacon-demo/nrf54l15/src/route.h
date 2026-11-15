#ifndef WAYPOINT_ROUTE_H
#define WAYPOINT_ROUTE_H
#include <stdbool.h>
#include <stddef.h>
#include "beacon.h"

struct waypoint {
    const char *label;            /* At most 14 uppercase characters. */
    uint8_t uuid[16];
    uint16_t major;
    uint16_t minor;
    const char *question[2];      /* At most 20 characters per line. */
    const char *answers[4];       /* At most 8 characters each. */
    unsigned correct_answer;     /* A=0, B=1, C=2, D=3. */
    float path_loss_exponent;
};
extern const struct waypoint route[];
extern const size_t route_count;
bool route_valid(const struct waypoint *items, size_t count);
bool waypoint_matches(const struct waypoint *target, const struct beacon_identity *id);
#endif
