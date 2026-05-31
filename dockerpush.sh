docker build -t localhost:32000/todo-frontend:1.0 ./frontend
docker build -t localhost:32000/todo-backend:1.0 ./backend
docker build -t localhost:32000/todo-reminder-worker:1.0 ./reminder-worker
docker build -t localhost:32000/todo-notification-function:1.0 ./notification-function
docker build -t localhost:32000/todo-attachment-processor:1.0 ./attachment-processor
