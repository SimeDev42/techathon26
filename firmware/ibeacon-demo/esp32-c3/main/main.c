#include "station_config.h"
#include "beacon.h"
#include "esp_bt.h"
#include "esp_bt_main.h"
#include "esp_gap_ble_api.h"
#include "esp_log.h"
#include "nvs_flash.h"

static const char *TAG = "ibeacon";
static uint8_t advertisement[BEACON_ADV_SIZE];
static esp_ble_adv_params_t params = {
    .adv_int_min = 0x00a0, /* 100 ms in 0.625 ms units (+ BLE random delay) */
    .adv_int_max = 0x00a0,
    .adv_type = ADV_TYPE_NONCONN_IND,
    .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
    .channel_map = ADV_CHNL_ALL,
    .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
};

static void gap_event(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *p)
{
    if (event == ESP_GAP_BLE_ADV_DATA_RAW_SET_COMPLETE_EVT) {
        if (p->adv_data_raw_cmpl.status != ESP_BT_STATUS_SUCCESS) {
            ESP_LOGE(TAG, "Advertising data rejected: %d", p->adv_data_raw_cmpl.status);
            return;
        }
        ESP_ERROR_CHECK(esp_ble_gap_start_advertising(&params));
    } else if (event == ESP_GAP_BLE_ADV_START_COMPLETE_EVT) {
        if (p->adv_start_cmpl.status != ESP_BT_STATUS_SUCCESS) {
            ESP_LOGE(TAG, "Advertising failed: %d", p->adv_start_cmpl.status);
            return;
        }
        ESP_LOGI(TAG, "iBeacon running: major=%u minor=%u, 1 m calibration=%d dBm",
                 (unsigned)BEACON_MAJOR, (unsigned)BEACON_MINOR, BEACON_RSSI_AT_1M);
    }
}

void techathon_beacon_start(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    ESP_ERROR_CHECK(err);
    esp_bt_controller_config_t cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_bt_controller_init(&cfg));
    ESP_ERROR_CHECK(esp_bt_controller_enable(ESP_BT_MODE_BLE));
    ESP_ERROR_CHECK(esp_bluedroid_init());
    ESP_ERROR_CHECK(esp_bluedroid_enable());
    ESP_ERROR_CHECK(esp_ble_gap_register_callback(gap_event));
    beacon_make_advertisement(advertisement);
    ESP_ERROR_CHECK(esp_ble_gap_config_adv_data_raw(advertisement, sizeof(advertisement)));
}

/* ESP-IDF entry point; Arduino's runtime supplies its own app_main. */
#ifndef ARDUINO
void app_main(void)
{
    techathon_beacon_start();
}
#endif
