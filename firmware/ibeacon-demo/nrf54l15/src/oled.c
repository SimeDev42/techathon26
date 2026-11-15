/* SSD1315 128x64, four-pin I2C module; pixels stored in page order. */
#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/sys/printk.h>
#include <errno.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include "oled.h"

static const struct device *const bus = DEVICE_DT_GET(DT_NODELABEL(i2c21));
static uint8_t address;

static int command(uint8_t value)
{
    uint8_t packet[] = {0x00, value};
    return i2c_write(bus, packet, sizeof(packet), address);
}

/* One page is eight pixels high. Send in small chunks for EasyDMA. */
static int write_page(uint8_t page, const uint8_t pixels[128])
{
    int err = command(0xB0 | page);
    if (!err) { err = command(0x00); }
    if (!err) { err = command(0x10); }
    for (int x = 0; x < 128 && !err; x += 16) {
        uint8_t packet[17] = {0x40};
        memcpy(packet + 1, pixels + x, 16);
        err = i2c_write(bus, packet, sizeof(packet), address);
    }
    return err;
}

static uint8_t frame[8][128];

/* 5x7 uppercase and numeric glyphs, columns with the top pixel in bit 0. */
static const uint8_t letters[26][5] = {
 {0x7e,0x11,0x11,0x11,0x7e}, {0x7f,0x49,0x49,0x49,0x36},
 {0x3e,0x41,0x41,0x41,0x22}, {0x7f,0x41,0x41,0x22,0x1c},
 {0x7f,0x49,0x49,0x49,0x41}, {0x7f,0x09,0x09,0x09,0x01},
 {0x3e,0x41,0x49,0x49,0x7a}, {0x7f,0x08,0x08,0x08,0x7f},
 {0x00,0x41,0x7f,0x41,0x00}, {0x20,0x40,0x41,0x3f,0x01},
 {0x7f,0x08,0x14,0x22,0x41}, {0x7f,0x40,0x40,0x40,0x40},
 {0x7f,0x02,0x0c,0x02,0x7f}, {0x7f,0x04,0x08,0x10,0x7f},
 {0x3e,0x41,0x41,0x41,0x3e}, {0x7f,0x09,0x09,0x09,0x06},
 {0x3e,0x41,0x51,0x21,0x5e}, {0x7f,0x09,0x19,0x29,0x46},
 {0x46,0x49,0x49,0x49,0x31}, {0x01,0x01,0x7f,0x01,0x01},
 {0x3f,0x40,0x40,0x40,0x3f}, {0x1f,0x20,0x40,0x20,0x1f},
 {0x3f,0x40,0x38,0x40,0x3f}, {0x63,0x14,0x08,0x14,0x63},
 {0x07,0x08,0x70,0x08,0x07}, {0x61,0x51,0x49,0x45,0x43}
};
static const uint8_t digits[10][5] = {
 {0x3e,0x51,0x49,0x45,0x3e}, {0x00,0x42,0x7f,0x40,0x00},
 {0x42,0x61,0x51,0x49,0x46}, {0x21,0x41,0x45,0x4b,0x31},
 {0x18,0x14,0x12,0x7f,0x10}, {0x27,0x45,0x45,0x45,0x39},
 {0x3c,0x4a,0x49,0x49,0x30}, {0x01,0x71,0x09,0x05,0x03},
 {0x36,0x49,0x49,0x49,0x36}, {0x06,0x49,0x49,0x29,0x1e}
};

static void pixel(int x, int y)
{
    if (x >= 0 && x < 128 && y >= 0 && y < 64) {
        frame[y / 8][x] |= 1U << (y % 8);
    }
}

static void text(int x, int y, const char *str, int scale)
{
    for (; *str; ++str, x += 6 * scale) {
        for (int col = 0; col < 5; ++col) {
            uint8_t bits = 0;
            if (*str >= 'A' && *str <= 'Z') { bits = letters[*str - 'A'][col]; }
            else if (*str >= '0' && *str <= '9') { bits = digits[*str - '0'][col]; }
            else if (*str == '-') { bits = 0x08; }
            else if (*str == '?') { const uint8_t g[] = {2,1,81,9,6}; bits = g[col]; }
            else if (*str == '/') { const uint8_t g[] = {32,16,8,4,2}; bits = g[col]; }
            else if (*str == '.') { bits = col == 2 ? 0x60 : 0; }
            for (int row = 0; row < 7; ++row) {
                if (!(bits & (1U << row))) { continue; }
                for (int dx = 0; dx < scale; ++dx) {
                    for (int dy = 0; dy < scale; ++dy) {
                        pixel(x + col * scale + dx, y + row * scale + dy);
                    }
                }
            }
        }
    }
}

int oled_render(const struct display_frame *view)
{
    memset(frame, 0, sizeof(frame));
    text(4, 1, view->label, 1);
    text(72, 1, view->audio_enabled ? "SND" : "MUTE", 1);
    text(104, 1, view->progress, 1);
    for (int x = 4; x < 124; ++x) { pixel(x, 10); }
    if (view->state == WELCOME) {
        text(4, 14, view->status, 2);
        text(4, 33, view->detail, 1);
        text(4, 44, "A - START GAME", 1);
        text(4, 54, "B - TOGGLE AUDIO", 1);
    } else if (view->state == QUESTION) {
        text(4, 13, view->question[0], 1);
        text(4, 22, view->question[1], 1);
        char option[12];
        for (int i = 0; i < 4; ++i) {
            snprintk(option, sizeof(option), "%c %s", 'A' + i, view->answers[i]);
            text(i % 2 ? 68 : 4, i < 2 ? 34 : 44, option, 1);
        }
        text(4, 56, "A  B  C  D TO ANSWER", 1);
    } else {
        text(4, 17, view->status, 2);
        text(4, 36, view->detail, 1);
        for (int i = 0; i < 10; ++i) {
            bool filled = view->state == NAVIGATING && !strcmp(view->status, "SEARCHING") ?
                          i == view->search_position : i < view->bars;
            for (int x = 0; x < 9; ++x) {
                for (int y = 0; y < 14; ++y) {
                    if (filled || x == 0 || x == 8 || y == 0 || y == 13) {
                        pixel(4 + i * 12 + x, 49 + y);
                    }
                }
            }
        }
    }
    for (uint8_t page = 0; page < 8; ++page) {
        int err = write_page(page, frame[page]);
        if (err) { return err; }
    }
    return 0;
}

int oled_init(void)
{
    if (!device_is_ready(bus)) {
        printk("I2C controller not ready\n");
        return -ENODEV;
    }
    k_msleep(100);

    /* Detect either standard 7-bit SSD1315 address using display-off. */
    address = 0x3C;
    if (command(0xAE)) {
        address = 0x3D;
        if (command(0xAE)) {
            printk("No OLED at 0x3C/0x3D. Check power, SDA and SCL.\n");
            return -ENODEV;
        }
    }
    printk("OLED responding at 0x%02x\n", address);

    static const uint8_t init[] = {
        0xAE,             /* Display off */
        0xD5, 0x80,       /* Clock */
        0xA8, 0x3F,       /* 64 rows */
        0xD3, 0x00,       /* Display offset */
        0x40,             /* Start line zero */
        0x8D, 0x14,       /* Internal charge pump */
        0x20, 0x02,       /* Page addressing */
        0xA1, 0xC8,       /* Segment / COM direction */
        0xDA, 0x12,       /* COM configuration for 128x64 */
        0x81, 0x7F,       /* Moderate contrast */
        0xAD, 0x10,       /* SSD1315 internal current reference, 150 uA max */
        0xD9, 0xF1,       /* Precharge */
        0xDB, 0x20,       /* VCOMH */
        0xA4, 0xA6,       /* Show RAM, normal polarity */
    };
    for (size_t i = 0; i < sizeof(init); ++i) {
        int err = command(init[i]);
        if (err) {
            printk("OLED initialization failed: %d\n", err);
            return -ENODEV;
        }
    }

    /* Clear old RAM before enabling the panel. */
    memset(frame, 0, sizeof(frame));
    for (uint8_t page = 0; page < 8; ++page) {
        int err = write_page(page, frame[page]);
        if (err) { return err; }
    }
    return command(0xAF);
}
