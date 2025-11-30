pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                sshagent(['github-ssh-global']) {
                    git branch: 'main', url: 'git@github.com:NamYounDong/YAME_NEXT_NEST_JS.git'
                }
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                cd ~/infra
                docker compose -f docker-compose.yame.yml build
                docker compose -f docker-compose.yame.yml up -d
                '''
            }
        }
    }
}