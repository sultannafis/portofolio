package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func getRedisClient() *http.Client {
	return &http.Client{Timeout: 5 * time.Second}
}

func upstashRequest(command string, args ...interface{}) (interface{}, error) {
	url := os.Getenv("UPSTASH_REDIS_REST_URL")
	token := os.Getenv("UPSTASH_REDIS_REST_TOKEN")

	if url == "" || token == "" {
		return nil, fmt.Errorf("redis credentials not set")
	}

	payload := []interface{}{command}
	payload = append(payload, args...)

	bodyData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := getRedisClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var res map[string]interface{}
	if err := json.Unmarshal(b, &res); err != nil {
		return nil, err
	}
	if res["error"] != nil {
		return nil, fmt.Errorf("%v", res["error"])
	}
	return res["result"], nil
}

// RedisIncr increments the key by one.
func RedisIncr(key string) (int, error) {
	res, err := upstashRequest("INCR", key)
	if err != nil {
		return 0, err
	}
	val, ok := res.(float64)
	if !ok {
		return 0, fmt.Errorf("unexpected response type")
	}
	return int(val), nil
}

// RedisExpire sets expiration on a key (in seconds).
func RedisExpire(key string, seconds int) error {
	_, err := upstashRequest("EXPIRE", key, seconds)
	return err
}

// RedisSetNX sets a key only if it does not exist, with an expiration (in seconds).
// Returns true if the key was set, false if it already existed.
func RedisSetNX(key string, value string, seconds int) (bool, error) {
	res, err := upstashRequest("SET", key, value, "EX", seconds, "NX")
	if err != nil {
		return false, err
	}
	// Upstash returns "OK" if set, nil if not set.
	if res == nil {
		return false, nil
	}
	return true, nil
}
