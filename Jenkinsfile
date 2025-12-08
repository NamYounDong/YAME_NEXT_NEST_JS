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
                    # 기존 .env 있으면 삭제 (파일 퍼미션과 상관없이 디렉터리 쓰기 권한으로 삭제 가능)
                    rm -f agentend/.env
                    rm -f backend/.env
                    rm -f frontend/.env


                    # 각 서비스 디렉터리에 .env 복사
                    cp "$AGENT_ENV"    agentend/.env
                    cp "$BACKEND_ENV"  backend/.env
                    cp "$FRONTEND_ENV" frontend/.env

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
