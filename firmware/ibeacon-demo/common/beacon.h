#ifndef TECHATHON_BEACON_H
#define TECHATHON_BEACON_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

/* UUID: 7b8a2f10-6c45-4d9e-a123-54726b617468 (wire order). */
#define BEACON_UUID_BYTES {0x7b,0x8a,0x2f,0x10,0x6c,0x45,0x4d,0x9e, \
                           0xa1,0x23,0x54,0x72,0x6b,0x61,0x74,0x68}
#define BEACON_MAJOR 1U       /* Exhibition ID */
#ifndef BEACON_MINOR
#define BEACON_MINOR 1U       /* Station ID; change for each station */
#endif
#define BEACON_RSSI_AT_1M (-59) /* Placeholder: calibrate with this receiver */
#define BEACON_ADV_SIZE 30U

static inline void beacon_make_advertisement(uint8_t out[BEACON_ADV_SIZE])
{
    const uint8_t uuid[16] = BEACON_UUID_BYTES;
    const uint8_t header[] = {0x02,0x01,0x06,0x1a,0xff,0x4c,0x00,0x02,0x15};
    memcpy(out, header, sizeof(header));
    memcpy(out + 9, uuid, sizeof(uuid));
    out[25] = BEACON_MAJOR >> 8;
    out[26] = BEACON_MAJOR & 0xff;
    out[27] = BEACON_MINOR >> 8;
    out[28] = BEACON_MINOR & 0xff;
    out[29] = (uint8_t)BEACON_RSSI_AT_1M;
}

struct beacon_identity {
    uint8_t uuid[16];
    uint16_t major;
    uint16_t minor;
    int8_t power_at_1m;
};

/* Manufacturer AD field only, without length/type. No unaligned casts. */
static inline bool beacon_decode(const uint8_t *data, size_t len,
                                 struct beacon_identity *out)
{
    if (len != 25 || data[0] != 0x4c || data[1] != 0 ||
        data[2] != 0x02 || data[3] != 0x15) {
        return false;
    }
    int value = data[24] < 128 ? data[24] : (int)data[24] - 256;
    if (value >= 0 || value < -126) { return false; }
    memcpy(out->uuid, data + 4, 16);
    out->major = ((uint16_t)data[20] << 8) | data[21];
    out->minor = ((uint16_t)data[22] << 8) | data[23];
    out->power_at_1m = (int8_t)value;
    return true;
}

static inline bool beacon_match(const uint8_t *data, size_t len, int8_t *power)
{
    const uint8_t uuid[16] = BEACON_UUID_BYTES;
    struct beacon_identity id;
    if (!beacon_decode(data, len, &id) || memcmp(id.uuid, uuid, 16) ||
        id.major != BEACON_MAJOR || id.minor != BEACON_MINOR) {
        return false;
    }
    *power = id.power_at_1m;
    return true;
}
#endif
