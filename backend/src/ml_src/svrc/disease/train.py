# 파기 예정 소스
# - 학습으로서 의미 없는 소스(데이터 이슈)
# - 설계 및 판단 미스 : 증상 및 질병 데이터의 집합이 아닌, 질병의 마스터 데이터로 학습하려고 함. 이는 러닝의 이해가 부족하여 잘못된 판단을 함.


import os, json, sys, argparse
import torch, joblib
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from sentence_transformers import SentenceTransformer
import pandas as pd
from sklearn.preprocessing import LabelEncoder

# 절대 경로로 import
from ml_src.config.database import read_df

# 로거 설정
from ml_src.config.util import init_logger, get_logger
init_logger()
logger = get_logger(__name__)

def parse_arguments():
    """
    명령행 인수를 파싱하는 함수
    
    Returns:
        argparse.Namespace: 파싱된 인수들
    """
    parser = argparse.ArgumentParser(description='Disease Classification Model Training')
    parser.add_argument('--epochs', type=int, default=10, 
                       help='Number of training epochs (default: 10)')
    parser.add_argument('--batch-size', type=int, default=64,
                       help='Training batch size (default: 64)')
    parser.add_argument('--learning-rate', type=float, default=2e-4,
                       help='Learning rate (default: 2e-4)')
    parser.add_argument('--train-split', type=float, default=0.85,
                       help='Training data split ratio (default: 0.85)')
    
    return parser.parse_args()

# 명령행 인수 파싱
args = parse_arguments()
logger.info(f"Training arguments: epochs={args.epochs}, batch_size={args.batch_size}, lr={args.learning_rate}, train_split={args.train_split}")

EMBED_NAME = os.getenv("EMBED_NAME", "distiluse-base-multilingual-cased-v2")
logger.info(f"Using embedding model: {EMBED_NAME}")

MODEL_DIR = "ml_models"
os.makedirs(MODEL_DIR, exist_ok=True)
logger.info(f"Model directory created/verified: {MODEL_DIR}")

class SymptomDataset(Dataset):
    def __init__(self, texts, labels, embed):
        logger.info(f"Initializing SymptomDataset with {len(texts)} samples")
        self.encoder = LabelEncoder()
        self.y = self.encoder.fit_transform(labels)
        logger.info(f"Label encoding completed. Number of unique classes: {len(self.encoder.classes_)}")
        
        logger.info("Starting text embedding encoding...")
        self.X = embed.encode(texts, convert_to_tensor=True)
        logger.info(f"Text embedding completed. Shape: {self.X.shape}")

    def __len__(self): return len(self.y)
    def __getitem__(self, i): return self.X[i], torch.tensor(self.y[i], dtype=torch.long)

class MLP(nn.Module):
    def __init__(self, in_dim, n_cls):
        super().__init__()
        logger.info(f"Initializing MLP model - Input dim: {in_dim}, Output classes: {n_cls}")
        self.net = nn.Sequential(
            nn.Linear(in_dim, 384), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(384, 256), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(256, n_cls)
        )
        logger.info("MLP model architecture created successfully")
    def forward(self, x): return self.net(x)

def main():
    try:
        logger.info("Starting main training process...")
        
        # 데이터베이스에서 데이터 로드
        logger.info("Loading data from database...")
        df = read_df("""
            select disease_id, disease_name_kor, symptoms
            from disease_master
            where coalesce(symptoms,'') <> ''
        """)
        logger.info(f"Loaded {len(df)} records from database")
        
        texts = df["symptoms"].astype(str).tolist()
        labels = df["disease_name_kor"].astype(str).tolist()
        logger.info(f"Prepared {len(texts)} text samples and {len(labels)} labels")
        

        # 임베딩 모델 로드
        logger.info(f"Loading SentenceTransformer model: {EMBED_NAME}")
        embed = SentenceTransformer(EMBED_NAME)
        logger.info("SentenceTransformer model loaded successfully")
        
        # 데이터셋 생성
        ds = SymptomDataset(texts, labels, embed)
        dim = embed.get_sentence_embedding_dimension()
        n_cls = len(set(ds.y))
        logger.info(f"Dataset created - Embedding dimension: {dim}, Number of classes: {n_cls}")

        # 데이터 분할
        tr = int(len(ds) * args.train_split)
        va = len(ds) - tr
        
        logger.info(f"Splitting dataset - Training: {tr} samples, Validation: {va} samples")
        
        tr_ds, va_ds = random_split(ds, [tr, va], generator=torch.Generator().manual_seed(42))
        tr_dl = DataLoader(tr_ds, batch_size=args.batch_size, shuffle=True)
        va_dl = DataLoader(va_ds, batch_size=args.batch_size * 2)  # 검증은 더 큰 배치 크기 사용
        logger.info("DataLoaders created successfully")

        # 모델 초기화
        model = MLP(dim, n_cls)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device} ================================================")
        model.to(device)
        
        # 옵티마이저와 손실 함수 설정
        opt = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
        crit = nn.CrossEntropyLoss()
        logger.info("Model, optimizer, and loss function initialized")

        # 훈련 시작
        best_acc = 0.0
        logger.info(f"Starting training process for {args.epochs} epochs...")
        
        
        
        
        
        # 라벨 분포 : 검증 라벨 중 ‘학습에 없는 라벨’ 비율 체크 =====================================================
        try:
            from collections import Counter
            cnt = Counter(labels)
            logger.info(f"Class Cnt : {len(cnt)} Sample Cnt: {len(labels)}")
            logger.info(f"Low Sample Class Cnt: {sum(c<=1 for c in cnt.values())}")

            # 기존 random_split 결과 인덱스(tr_idx, va_idx)를 구한 뒤:
            tr_idx, va_idx = tr_ds.indices, va_ds.indices
            
            train_labels = [labels[i] for i in tr_idx]
            val_labels   = [labels[i] for i in va_idx]

            train_set = set(train_labels)
            val_set   = set(val_labels)
            only_in_val = [c for c in val_set if c not in train_set]

            logger.info(f"Check Class Cnt: {len(val_set)}")
            logger.info(f"No Train Class Cnt: {len(only_in_val)}")
            logger.info(f"Check Unlearned Class Ratio: {len(only_in_val) / max(1, len(val_set))}")
        except Exception as e:
            logger.error(f"Error in label distribution check: {str(e)}")
        # ====================================================================================================
        
        
        
        
        
        
        
        
        for epoch in range(args.epochs):
            logger.info(f"Epoch {epoch+1}/{args.epochs} started")
            
            # 훈련 단계
            model.train()
            train_loss = 0.0
            for batch_idx, (xb, yb) in enumerate(tr_dl):
                xb, yb = xb.to(device), yb.to(device)
                opt.zero_grad()
                loss = crit(model(xb), yb)
                loss.backward()
                opt.step()
                train_loss += loss.item()
            
            avg_train_loss = train_loss / len(tr_dl)
            logger.info(f"Epoch {epoch+1} - Average training loss: {avg_train_loss:.4f}")

            # 검증 단계
            model.eval()
            correct = 0
            total = 0
            with torch.no_grad():
                for xb, yb in va_dl:
                    xb, yb = xb.to(device), yb.to(device)
                    pred = model(xb).argmax(-1)
                    correct += (pred == yb).sum().item()
                    total += yb.numel()
            
            acc = correct/total if total else 0.0
            logger.info(f"Epoch {epoch+1} - Validation accuracy: {acc:.4f}")
            
            # 최고 성능 모델 저장
            if acc > best_acc:
                model_path = os.path.join(MODEL_DIR, "cls.pt")
                logger.info(f"New best accuracy achieved: {best_acc:.4f} - Saving model to {model_path}")
                
                best_acc = acc
                logger.info(f"New best accuracy achieved: {best_acc:.4f} - Saving model...")
                torch.save(model.state_dict(), model_path)
                joblib.dump(ds.encoder, os.path.join(MODEL_DIR, "label_encoder.joblib"))
                with open(os.path.join(MODEL_DIR, "embed_name.json"), "w") as f:
                    json.dump({"embed": EMBED_NAME}, f)
                logger.info("Model saved successfully")
        
        logger.info(f"Training completed. Best validation accuracy: {best_acc:.4f}")
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        raise e

if __name__ == "__main__":
    try:
        main()
        # 객체를 JSON 문자열로 변환
        print(json.dumps({"success": "true"}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": "false"}, ensure_ascii=False))