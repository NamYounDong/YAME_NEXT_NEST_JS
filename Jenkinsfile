pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git(
                    branch: 'main',
                    credentialsId: 'github-ssh',
                    url: 'git@github.com:NamYounDong/YAME_NEXT_NEST_JS.git'
                )
            }
        }

        stage('Prepare .env files') {
            steps {
                withCredentials([
                    file(credentialsId: 'YAME_AGENTEND_ENV',  variable: 'AGENT_ENV'),
                    file(credentialsId: 'YAME_BACKEND_ENV',   variable: 'BACKEND_ENV'),
                    file(credentialsId: 'YAME_FRONTEND_ENV',  variable: 'FRONTEND_ENV')
                ]) {
                    sh '''
                    # Jenkins 워크스페이스 기준
                    ls -al

                    # 각 서비스 디렉터리에 .env 복사
                    sudo cp "$AGENT_ENV"    agentend/.env
                    sudo cp "$BACKEND_ENV"  backend/.env
                    sudo cp "$FRONTEND_ENV" frontend/.env

                    # 확인용
                    ls -al agentend
                    ls -al backend
                    ls -al frontend
                    '''
                }
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                docker compose build
                docker compose down
                docker compose up -d
                '''
            }
        }
    }
}
