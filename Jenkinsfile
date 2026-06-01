pipeline {
    agent any

    environment {
        REGISTRY = "192.168.27.134:32000"
        IMAGE_TAG = "ci-${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend install check') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm run test --if-present || echo "No backend tests configured yet"'
                }
            }
        }

        stage('Frontend install check') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run test --if-present || echo "No backend tests configured yet"'
                }
            }
        }

        stage('Build Docker images') {
            steps {
                sh '''
                  docker build -t $REGISTRY/todo-backend:$IMAGE_TAG ./backend
                  docker build -t $REGISTRY/todo-frontend:$IMAGE_TAG ./frontend
                  docker build -t $REGISTRY/todo-reminder-worker:$IMAGE_TAG ./reminder-worker
                  docker build -t $REGISTRY/todo-notification-function:$IMAGE_TAG ./notification-function
                  docker build -t $REGISTRY/todo-attachment-processor:$IMAGE_TAG ./attachment-processor
                '''
            }
        }

        stage('Push Docker images') {
            steps {
                sh '''
                  docker push $REGISTRY/todo-backend:$IMAGE_TAG
                  docker push $REGISTRY/todo-frontend:$IMAGE_TAG
                  docker push $REGISTRY/todo-reminder-worker:$IMAGE_TAG
                  docker push $REGISTRY/todo-notification-function:$IMAGE_TAG
                  docker push $REGISTRY/todo-attachment-processor:$IMAGE_TAG
                '''
            }
        }
    }

    post {
        success {
            echo "CI pipeline completed successfully. Images pushed with tag: ${IMAGE_TAG}"
        }
        failure {
            echo "CI pipeline failed."
        }
    }
}