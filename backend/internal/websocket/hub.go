package websocket

import (
	"encoding/json"
	"fmt"
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

var HubInstance *Hub

func NewHub() *Hub {
	HubInstance = &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	return HubInstance
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			fmt.Printf("🔌 Client connected. Online: %d\n", h.ClientCount())
			h.BroadcastVisitorCount()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			fmt.Printf("🔌 Client disconnected. Online: %d\n", h.ClientCount())
			h.BroadcastVisitorCount()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) BroadcastVisitorCount() {
	msg := WSMessage{
		Type:    "visitor:count",
		Payload: map[string]int{"count": h.ClientCount()},
	}
	data, _ := json.Marshal(msg)
	h.broadcast <- data
}

func (h *Hub) BroadcastMessage(msgType string, payload interface{}) {
	msg := WSMessage{
		Type:    msgType,
		Payload: payload,
	}
	data, _ := json.Marshal(msg)
	h.broadcast <- data
}
