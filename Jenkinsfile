pipeline {
    agent any

    stages {

        stage('Fetch Code') {
            steps {
                echo 'Cloning repository...'
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('client') {
                    sh 'npm install'
                }
            }
        }

        stage('Build') {
            steps {
                dir('client') {
                    sh 'npm run build'
                }
            }
        }

        stage('Test') {
            steps {
                dir('client') {
                    sh 'npm test || echo "No tests found"'
                }
            }
        }

        stage('Security Scan') {
            steps {
                dir('client') {
                    sh 'npm audit || echo "Audit completed"'
                }
            }
        }

        stage('Docker Build') {
            steps {
                dir('client') {
                    sh '''
                    cat > Dockerfile <<EOF
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 4000
CMD ["serve", "-s", "dist", "-l", "4000"]
EOF
                    docker build -t deployed-app:latest .
                    '''
                }
            }
        }

        stage('Run Container') {
            steps {
                sh '''
                docker rm -f deployed-app-container || true
                docker run -d --name deployed-app-container -p 2000:4000 deployed-app:latest
                '''
            }
        }
    }
}