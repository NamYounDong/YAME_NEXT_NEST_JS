"""
벡터 스토어 관리 모듈

Chroma DB를 사용하여 DUR 데이터의 벡터 임베딩을 저장하고 검색합니다.

벡터 스토어를 사용하는 이유:
- 의미론적 검색 (Semantic Search): 키워드가 정확하지 않아도 유사한 의미의 약품 검색
- 빠른 검색 속도: 벡터 유사도 계산이 SQL LIKE보다 빠름
- 다국어 지원: 임베딩은 언어에 무관

Chroma DB를 선택한 이유:
- 경량화 (embedded 모드로 실행 가능)
- LangChain 통합이 쉬움
- 필터링 기능 지원 (메타데이터 검색)
"""

from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.docstore.document import Document
from typing import List, Dict, Any, Optional
import logging
import os

from app.config import settings

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """
    벡터 스토어 관리 클래스
    
    DUR 데이터의 임베딩을 생성하고 Chroma DB에 저장합니다.
    """
    
    def __init__(self):
        """
        벡터 스토어 초기화
        
        OpenAI Embeddings를 사용하여 텍스트를 벡터로 변환합니다.
        모델: text-embedding-3-small (512 차원, 빠르고 저렴)
        """
        self.embeddings = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # 벡터 스토어 저장 경로
        self.persist_directory = settings.VECTOR_STORE_PATH
        
        # Chroma 벡터 스토어 (로드 또는 생성)
        self.vector_store: Optional[Chroma] = None
        
        logger.info(f"벡터 스토어 초기화: path={self.persist_directory}")
    
    def load_vector_store(self) -> bool:
        """
        기존 벡터 스토어 로드
        
        벡터 스토어가 이미 구축되어 있으면 로드합니다.
        
        Returns:
            bool: 로드 성공 시 True
        """
        try:
            if not os.path.exists(self.persist_directory):
                logger.warning("벡터 스토어가 존재하지 않습니다. 먼저 구축해야 합니다.")
                return False
            
            self.vector_store = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
                collection_name="dur_drugs"  # 컬렉션 이름
            )
            
            # 문서 개수 확인
            count = self.vector_store._collection.count()
            logger.info(f"✓ 벡터 스토어 로드 성공: {count}개 문서")
            
            return True
            
        except Exception as e:
            logger.error(f"✗ 벡터 스토어 로드 실패: {str(e)}")
            return False
    
    def create_drug_document(self, drug_info: Dict[str, Any]) -> Document:
        """
        약품 정보를 LangChain Document로 변환
        
        Document 구조:
        - page_content: 검색에 사용될 텍스트 (약품명, 성분, 효능 등)
        - metadata: 필터링 및 후처리에 사용될 메타데이터 (품목코드, 제조사 등)
        
        Args:
            drug_info: DUR 데이터베이스에서 조회한 약품 정보
        
        Returns:
            Document: LangChain Document 객체
        """
        # 검색용 텍스트 생성
        # 약품명, 성분, 분류 정보를 모두 포함하여 다양한 검색어에 매칭되도록 함
        page_content = f"""
약품명: {drug_info.get('ITEM_NAME', '')}
제조사: {drug_info.get('ENTP_NAME', '')}
성분: {drug_info.get('MATERIAL_NAME', '')}
분류: {drug_info.get('CLASS_NO', '')}
효능: {drug_info.get('EE_DOC_ID', '정보 없음')}
        """.strip()
        
        # 메타데이터 (필터링 및 후처리용)
        metadata = {
            "item_seq": drug_info.get('ITEM_SEQ', ''),
            "item_name": drug_info.get('ITEM_NAME', ''),
            "entp_name": drug_info.get('ENTP_NAME', ''),
            "class_no": drug_info.get('CLASS_NO', ''),
            # OTC 여부를 메타데이터에 저장하여 필터링 가능
            "is_otc": True  # 여기서는 OTC만 저장한다고 가정
        }
        
        return Document(
            page_content=page_content,
            metadata=metadata
        )
    
    def build_vector_store(self, drug_list: List[Dict[str, Any]]) -> bool:
        """
        DUR 데이터로 벡터 스토어 구축
        
        대량의 약품 정보를 임베딩하여 Chroma DB에 저장합니다.
        
        주의: 
        - OpenAI Embeddings API 비용 발생 (약 $0.02 per 1M tokens)
        - 시간이 오래 걸릴 수 있음 (1000개 약품 = 약 1-2분)
        
        Args:
            drug_list: 약품 정보 리스트
        
        Returns:
            bool: 구축 성공 시 True
        """
        try:
            logger.info(f"벡터 스토어 구축 시작: {len(drug_list)}개 약품")
            
            # Document 변환
            documents = [self.create_drug_document(drug) for drug in drug_list]
            logger.info(f"Document 변환 완료: {len(documents)}개")
            
            # Chroma 벡터 스토어 생성
            # from_documents: Document 리스트를 벡터화하여 저장
            self.vector_store = Chroma.from_documents(
                documents=documents,
                embedding=self.embeddings,
                persist_directory=self.persist_directory,
                collection_name="dur_drugs"
            )
            
            logger.info(f"✓ 벡터 스토어 구축 완료: {len(documents)}개 문서 저장")
            return True
            
        except Exception as e:
            logger.error(f"✗ 벡터 스토어 구축 실패: {str(e)}")
            return False
    
    def search(
        self, 
        query: str, 
        k: int = None,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """
        벡터 유사도 검색
        
        사용자 쿼리와 유사한 약품을 검색합니다.
        
        검색 방식:
        1. 쿼리를 벡터로 변환
        2. 벡터 스토어에서 유사도가 높은 문서 검색
        3. 메타데이터 필터 적용 (선택)
        
        Args:
            query: 검색 쿼리 (예: "두통 해열")
            k: 반환할 문서 개수 (기본: settings.RAG_TOP_K)
            filter: 메타데이터 필터 (예: {"is_otc": True})
        
        Returns:
            List[Document]: 검색 결과 문서 리스트
        """
        if not self.vector_store:
            logger.warning("벡터 스토어가 로드되지 않았습니다.")
            return []
        
        try:
            k = k or settings.RAG_TOP_K
            
            # 유사도 검색
            results = self.vector_store.similarity_search(
                query=query,
                k=k,
                filter=filter
            )
            
            logger.info(f"벡터 검색: query='{query}', results={len(results)}")
            return results
            
        except Exception as e:
            logger.error(f"벡터 검색 실패: {str(e)}")
            return []
    
    def search_with_score(
        self, 
        query: str, 
        k: int = None,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[tuple[Document, float]]:
        """
        벡터 유사도 검색 (점수 포함)
        
        검색 결과와 함께 유사도 점수를 반환합니다.
        점수가 높을수록 쿼리와 유사합니다.
        
        Args:
            query: 검색 쿼리
            k: 반환할 문서 개수
            filter: 메타데이터 필터
        
        Returns:
            List[tuple]: (Document, score) 튜플 리스트
        """
        if not self.vector_store:
            logger.warning("벡터 스토어가 로드되지 않았습니다.")
            return []
        
        try:
            k = k or settings.RAG_TOP_K
            
            # 유사도 점수와 함께 검색
            results = self.vector_store.similarity_search_with_score(
                query=query,
                k=k,
                filter=filter
            )
            
            logger.info(f"벡터 검색 (점수): query='{query}', results={len(results)}")
            
            # 점수 로깅 (디버깅용)
            for i, (doc, score) in enumerate(results[:3]):  # 상위 3개만
                logger.debug(f"  {i+1}. {doc.metadata.get('item_name')} (score={score:.4f})")
            
            return results
            
        except Exception as e:
            logger.error(f"벡터 검색 실패: {str(e)}")
            return []


# 싱글톤 인스턴스
vector_store_manager = VectorStoreManager()

