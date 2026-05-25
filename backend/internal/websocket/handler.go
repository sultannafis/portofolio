package websocket

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func HandleWebSocket(hub *Hub) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		client := NewClient(hub, c)
		hub.register <- client

		go client.WritePump()
		client.ReadPump()
	})
}
