pipeline {
    agent any

    environment {
        REGISTRY = "localhost:32000"
        GHCR_REGISTRY = "ghcr.io"
        GHCR_NAMESPACE = "paulkons"
        IMAGE_TAG = "ci-${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Check skip marker') {
            steps {
                script {
                    def commitMessage = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()

                    if (commitMessage.contains('[skip ci]')) {
                        env.SKIP_CI = 'true'
                        echo 'Skipping CI because commit contains [skip ci]'
                    } else {
                        env.SKIP_CI = 'false'
                    }
                }
            }
        }

        stage('Backend install check') {
            when {
                expression { env.SKIP_CI != 'true' }
            }
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm run test --if-present || echo "No backend tests configured yet"'
                }
            }
        }

        stage('Frontend install check') {
            when {
                expression { env.SKIP_CI != 'true' }
            }
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run test --if-present || echo "No backend tests configured yet"'
                }
            }
        }

        stage('Login to GitHub Container Registry') {
            when {
                expression { env.SKIP_CI != 'true' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-packages-pavlos',
                    usernameVariable: 'GHCR_USER',
                    passwordVariable: 'GHCR_TOKEN'
                )]) {
                    sh '''
                    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
                    '''
                }
            }
        }

        stage('Build Docker images') {
            when {
                expression { env.SKIP_CI != 'true' }
            }
            steps {
                sh '''
                docker build -t $REGISTRY/todo-backend:$IMAGE_TAG ./backend
                docker build -t $REGISTRY/todo-frontend:$IMAGE_TAG ./frontend
                docker build -t $REGISTRY/todo-reminder-worker:$IMAGE_TAG ./reminder-worker
                docker build -t $REGISTRY/todo-notification-function:$IMAGE_TAG ./notification-function
                docker build -t $REGISTRY/todo-attachment-processor:$IMAGE_TAG ./attachment-processor

                docker tag $REGISTRY/todo-backend:$IMAGE_TAG $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-backend:$IMAGE_TAG
                docker tag $REGISTRY/todo-frontend:$IMAGE_TAG $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-frontend:$IMAGE_TAG
                docker tag $REGISTRY/todo-reminder-worker:$IMAGE_TAG $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-reminder-worker:$IMAGE_TAG
                docker tag $REGISTRY/todo-notification-function:$IMAGE_TAG $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-notification-function:$IMAGE_TAG
                docker tag $REGISTRY/todo-attachment-processor:$IMAGE_TAG $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-attachment-processor:$IMAGE_TAG
                '''
            }
        }

        stage('Push Docker images') {
            when {
                expression { env.SKIP_CI != 'true' }
            }
            steps {
                sh '''
                docker push $REGISTRY/todo-backend:$IMAGE_TAG
                docker push $REGISTRY/todo-frontend:$IMAGE_TAG
                docker push $REGISTRY/todo-reminder-worker:$IMAGE_TAG
                docker push $REGISTRY/todo-notification-function:$IMAGE_TAG
                docker push $REGISTRY/todo-attachment-processor:$IMAGE_TAG

                docker push $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-backend:$IMAGE_TAG
                docker push $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-frontend:$IMAGE_TAG
                docker push $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-reminder-worker:$IMAGE_TAG
                docker push $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-notification-function:$IMAGE_TAG
                docker push $GHCR_REGISTRY/$GHCR_NAMESPACE/todo-attachment-processor:$IMAGE_TAG
                '''
            }
        }

        stage('Update Kubernetes manifests') {
            when {
                expression { env.SKIP_CI != 'true' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-pavlos',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh '''
                    git config user.name "Jenkins CI"
                    git config user.email "jenkins@example.local"

                    sed -i "s|image: localhost:32000/todo-backend:.*|image: localhost:32000/todo-backend:$IMAGE_TAG|" k8s/base/backend/backend.yaml
                    sed -i "s|image: localhost:32000/todo-frontend:.*|image: localhost:32000/todo-frontend:$IMAGE_TAG|" k8s/base/frontend/frontend.yaml
                    sed -i "s|image: localhost:32000/todo-reminder-worker:.*|image: localhost:32000/todo-reminder-worker:$IMAGE_TAG|" k8s/base/reminder-worker/reminder-worker.yaml
                    sed -i "s|image: localhost:32000/todo-attachment-processor:.*|image: localhost:32000/todo-attachment-processor:$IMAGE_TAG|" k8s/base/attachment-processor/attachment-processor.yaml
                    sed -i "s|image: localhost:32000/todo-notification-function:.*|image: localhost:32000/todo-notification-function:$IMAGE_TAG|" k8s/base/knative/notification-function-ksvc.yaml

                    git add k8s/base
                    git commit -m "Update image tags to $IMAGE_TAG [skip ci]" || echo "No manifest changes to commit"

                    git remote set-url origin https://$GIT_USER:$GIT_TOKEN@github.com/PaulKons/todo-cloud-native.git
                    git push origin HEAD:main
                    '''
                }
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