# 위드인천에너지 전결규정 웹 시스템

knowledge_base 폴더의 파일들을 실시간으로 읽어서 웹으로 표시하는 동적 애플리케이션입니다.

## 특징

- ✅ **실시간 파일 읽기**: knowledge_base 폴더의 파일만 수정하면 즉시 반영
- ✅ **검색 기능**: 전체 텍스트 검색 및 필터링
- ✅ **모바일 최적화**: iPhone 스타일의 반응형 디자인
- ✅ **동적 렌더링**: Python Flask로 서버 실행
- ✅ **깔끔한 UI**: 실제 전결규정 시스템처럼 전문적인 디자인

## 설치 방법

### 1. Python 설치 확인
```bash
python --version
```
Python 3.8 이상 필요

### 2. 필요한 패키지 설치
```bash
pip install -r requirements.txt
```

또는 직접 설치:
```bash
pip install Flask
```

## 실행 방법

### 방법 1: Python으로 직접 실행
```bash
python app.py
```

### 방법 2: Flask 명령어로 실행
```bash
flask run
```

실행 후 브라우저에서 접속:
```
http://localhost:5000
```

## 파일 구조

```
approval-rules-to-html/
├── app.py                      # Flask 웹 애플리케이션
├── requirements.txt            # Python 패키지 목록
├── templates/
│   └── index.html             # HTML 템플릿
├── static/
│   ├── styles.css             # 스타일시트
│   └── script.js              # JavaScript
└── knowledge_base/
    ├── 01_경영관리_structured.txt
    ├── 02_예산_structured.txt
    ├── ... (기타 전결규정 파일들)
    ├── 조직도_structured.txt
    └── 결재라인_가이드_structured.txt
```

## 데이터 수정 방법

1. `knowledge_base/` 폴더의 `.txt` 파일 수정
2. 브라우저 새로고침 (F5)
3. 변경사항 자동 반영!

## 기능

### 검색
- 항목명, 결재권자, 참고사항 전체 검색
- 실시간 검색 결과 하이라이트

### 필터
- 결재권자별 필터 (CEO, CSO, 본부장, 팀장)
- 금액별 필터 (억원, 천만원, 백만원)

### 탭 네비게이션
- 전체 개요
- 9개 장별 상세 규정
- 조직도
- 결재라인 가이드

## 배포 방법

### 로컬 네트워크에서 사용
```bash
python app.py
```
같은 네트워크의 다른 컴퓨터에서 `http://[서버IP]:5000` 접속

### 클라우드 배포 (선택사항)
- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run
- Azure App Service

## 문제 해결

### Flask를 찾을 수 없음
```bash
pip install Flask
```

### 포트 5000이 이미 사용 중
`app.py` 파일의 마지막 줄 수정:
```python
app.run(debug=True, host='0.0.0.0', port=8000)  # 포트 변경
```

## 라이선스

위드인천에너지 내부 사용
