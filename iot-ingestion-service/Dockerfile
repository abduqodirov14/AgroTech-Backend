FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o iot-service cmd/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/iot-service .

EXPOSE 3002
CMD ["./iot-service"]
