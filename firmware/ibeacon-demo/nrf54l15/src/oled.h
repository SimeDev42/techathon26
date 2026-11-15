#ifndef WAYPOINT_OLED_H
#define WAYPOINT_OLED_H
#include "game.h"
struct display_frame {
    enum game_state state;
    uint32_t revision;
    char label[15], progress[8], status[10], detail[21];
    char question[2][21], answers[4][9];
    uint8_t bars, search_position;
    bool audio_enabled;
};
int oled_init(void);
int oled_render(const struct display_frame *view);
#endif
