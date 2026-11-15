#ifndef WAYPOINT_GAME_H
#define WAYPOINT_GAME_H
#include <stdbool.h>
#include <stdint.h>
#include "route.h"

enum game_state { WELCOME, NAVIGATING, QUESTION, ANSWER_RIGHT, ANSWER_WRONG,
                  ROUTE_COMPLETE, CONFIG_ERROR };
enum proximity_band { SEARCHING, FAR, NEAR, CLOSE };
struct observation {
    bool fresh;          /* Matching packet within the 5-second lost timeout. */
    bool touch_fresh;    /* Matching packet within the last 1 second. */
    unsigned samples;
    float metres;
};
struct game {
    enum game_state state;
    enum proximity_band band, candidate;
    const struct waypoint *waypoints;
    size_t count, target;
    int64_t candidate_since, close_since, result_until;
    bool touch_ready;
    bool audio_enabled;
    int selected_answer;
};
void game_init(struct game *g, const struct waypoint *items, size_t count);
/* pressed is a debounced, release-armed bitmask: bit 0=A, 1=B, 2=C, 3=D. */
void game_step(struct game *g, const struct observation *o, uint8_t pressed, int64_t now);
int game_beep_gap_ms(const struct game *g); /* -1 = silent */
#endif
