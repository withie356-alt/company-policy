"""
위드인천에너지 전결규정 웹 애플리케이션
knowledge_base 폴더의 CSV 파일들을 동적으로 읽어서 표시
"""

from flask import Flask, render_template, jsonify, request
import os
import re
import csv
from pathlib import Path
from dotenv import load_dotenv
import requests
import time

# 환경 변수 로드
load_dotenv()

app = Flask(__name__)

# knowledge_base 폴더 경로
KNOWLEDGE_BASE_DIR = Path(__file__).parent / 'knowledge_base'


def parse_preface_csv(file_path):
    """서문 CSV 파일 파싱 (특별 처리)"""
    rules = []

    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        item = row.get('항목', '').strip()
        if not item:
            continue

        basis = row.get('근거조항', '').strip()
        notes = row.get('비고', '').strip()

        # 서문의 경우 비고가 실제 내용
        content = notes if notes else "-"

        rules.append({
            "item": item,
            "display_item": item,
            "item_number": "",
            "approvers": [],
            "notes": content,
            "annotation": None,
            "is_section_title": False,
            "is_sub_section": False,
            "basis": basis,
            "code": row.get('Code', ''),
            "section_num": "0"
        })

    return {
        "section": "서문",
        "version": "v2025.10.01",
        "notes": "전결규정 서문",
        "rules": rules,
        "common_annotations": []
    }


def parse_csv_file(file_path):
    """CSV 파일 파싱"""
    rules = []
    section = ""
    current_section_num = None  # 현재 절 번호 추적
    section_names = {}  # 절 번호별 이름 저장

    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # 먼저 각 절의 이름 파악 (첫 번째 조 항목에서 추출)
    for row in rows:
        basis = row.get('근거조항', '').strip()
        sec_num = row.get('절', '0')
        if sec_num and sec_num != '0' and sec_num not in section_names:
            # "제3장 구매 1절 1조" -> 절 이름 추출
            section_match = re.search(r'(\d+)절\s+(\d+)조', basis)
            if section_match:
                # 첫 번째 조의 항목명을 절 이름으로 사용
                item = row.get('항목', '').strip()
                if item and re.search(r'\d+조$', basis) and '항' not in basis:
                    section_names[sec_num] = item

    for row in rows:
        # 첫 번째 유효한 행에서 섹션 정보 추출
        if not section and row.get('근거조항'):
            # "제1장 경영관리 1조" -> "경영관리"
            match = re.search(r'제\d+장\s+(.+?)\s+\d+조', row['근거조항'])
            if match:
                section = match.group(1)

        item = row.get('항목', '').strip()
        if not item:
            continue

        # 절 정보
        section_num = row.get('절', '0')
        basis = row.get('근거조항', '').strip()

        # 절이 바뀌면 절 제목 행 추가 (절이 있는 장에서만)
        if section_num and section_num != '0' and section_num != current_section_num:
            current_section_num = section_num
            # 절 제목 추출
            section_title_match = re.search(r'(\d+)절', basis)
            if section_title_match:
                sec_num_str = section_title_match.group(1)
                # 절 이름이 있으면 사용, 없으면 기본 형식
                sec_name = section_names.get(section_num, '')
                section_title = f"제{sec_num_str}절 {sec_name}" if sec_name else f"제{sec_num_str}절"

                rules.append({
                    "item": section_title,
                    "display_item": section_title,
                    "item_number": "",
                    "approvers": [],
                    "notes": "-",
                    "annotation": None,
                    "is_section_title": True,
                    "is_sub_section": True,  # 절 제목임을 표시
                    "basis": "",
                    "code": "",
                    "section_num": section_num
                })

        # 결재권자 정보 파싱
        approvers = []

        # 전결권자
        if row.get('전결권자'):
            approvers.append({
                "role": row['전결권자'].strip(),
                "symbol": "◎"
            })

        # 합의
        if row.get('합의'):
            approvers.append({
                "role": row['합의'].strip(),
                "symbol": "○"
            })

        # 참조
        if row.get('참조'):
            approvers.append({
                "role": row['참조'].strip(),
                "symbol": "★"
            })

        # 보고
        if row.get('보고'):
            approvers.append({
                "role": row['보고'].strip(),
                "symbol": "□"
            })

        # 접수
        if row.get('접수'):
            approvers.append({
                "role": row['접수'].strip(),
                "symbol": "→"
            })

        # 비고를 notes로 사용
        notes = row.get('비고', '').strip() or "-"

        # 근거조항에서 번호 추출
        # 예: "제1장 경영관리 1조 1항" -> "1.1"
        # 예: "제3장 구매 1절 1조 1항 1호" -> "1.1.1"
        # 예: "제3장 구매 1절 1조 6항 1호 2목" -> "1.6.1(2)" (목은 괄호로 표시)
        item_number = ""
        if basis:
            article_match = re.search(r'(\d+)조', basis)
            paragraph_match = re.search(r'(\d+)항', basis)
            subpara_match = re.search(r'(\d+)호', basis)
            item_match = re.search(r'(\d+)목', basis)

            numbers = []
            if article_match:
                numbers.append(article_match.group(1))
            if paragraph_match:
                numbers.append(paragraph_match.group(1))
            if subpara_match:
                numbers.append(subpara_match.group(1))

            if numbers:
                item_number = ".".join(numbers)
                # 목이 있으면 괄호로 추가
                if item_match:
                    item_number += f"({item_match.group(1)})"

        # 섹션 타이틀 판별: 근거조항이 "X조"로 끝나고 "항"이 없는 경우
        is_section_title = bool(basis and re.search(r'\d+조$', basis) and '항' not in basis)

        # 표시용 항목명 생성
        display_item = f"{item_number} {item}" if item_number else item

        rules.append({
            "item": item,
            "display_item": display_item,
            "item_number": item_number,
            "approvers": approvers,
            "notes": notes,
            "annotation": None,
            "is_section_title": is_section_title,
            "is_sub_section": False,
            "basis": basis,
            "code": row.get('Code', ''),
            "section_num": section_num
        })

    return {
        "section": section,
        "version": "v2025.12.01",
        "notes": f"제{file_path.stem.split('_')[0]}장 {section}",
        "rules": rules,
        "common_annotations": []
    }


def get_approver_class(role):
    """결재권자 역할에 따른 CSS 클래스 반환"""
    role_lower = role.lower()
    if 'ceo' in role_lower or role == 'CEO':
        return 'approver-ceo'
    elif 'cso' in role_lower or role == 'CSO':
        return 'approver-cso'
    elif '본부장' in role or 'director' in role_lower:
        return 'approver-director'
    elif '팀장' in role or 'team' in role_lower:
        return 'approver-team-leader'
    elif '이사회' in role or 'board' in role_lower:
        return 'approver-board'
    else:
        return 'approver-staff'


def get_symbol_class(symbol):
    """결재 기호에 따른 CSS 클래스 반환"""
    symbol_map = {
        '◎': 'symbol-approve',
        '○': 'symbol-agree',
        '□': 'symbol-report',
        '★': 'symbol-refer',
        '→': 'symbol-refer'
    }
    return symbol_map.get(symbol, 'symbol-approve')


def get_symbol_text(symbol):
    """결재 기호를 텍스트로 변환"""
    symbol_text_map = {
        '◎': '전결',
        '○': '합의',
        '□': '보고',
        '★': '참조',
        '→': '접수'
    }
    return symbol_text_map.get(symbol, '')


def get_symbol_priority(symbol):
    """결재 기호의 우선순위 반환 (낮을수록 먼저 표시)"""
    priority_map = {
        '◎': 1,  # 전결 - 가장 먼저
        '○': 2,  # 합의
        '□': 3,  # 보고
        '★': 4,  # 참조
        '→': 5   # 접수
    }
    return priority_map.get(symbol, 99)


def determine_level(item_text):
    """항목의 계층 레벨 결정"""
    # 숫자 패턴으로 레벨 판단
    if re.match(r'^\d+\.\s', item_text):  # "1. ", "2. " 등
        return 1
    elif re.match(r'^\d+\.\d+\s', item_text):  # "1.1 ", "2.3 " 등
        return 2
    elif re.match(r'^\d+\.\d+\.\d+\s', item_text):  # "1.1.1 ", "2.3.4 " 등
        return 3
    elif re.match(r'^\(\d+\)', item_text):  # "(1)", "(2)" 등
        return 4
    else:
        return 2  # 기본값


@app.route('/')
def index():
    """메인 페이지"""
    # knowledge_base 폴더의 모든 파일 읽기
    all_data = {}

    # 파일 순서 정의 (CSV 파일)
    file_order = [
        ('00_서문.csv', '서문', 'tab-preface', True),  # True = 서문 특별 처리
        ('01_경영관리.csv', '경영관리', 'tab-management', False),
        ('02_예산.csv', '예산', 'tab-budget', False),
        ('03_구매.csv', '구매', 'tab-purchase', False),
        ('04_재무.csv', '재무', 'tab-finance', False),
        ('05_자산관리.csv', '자산관리', 'tab-asset', False),
        ('06_인사_총무.csv', '인사/총무', 'tab-hr', False),
        ('07_법제_법무.csv', '법제/법무', 'tab-legal', False),
        ('08_사업개발_생산_홍보.csv', '사업개발', 'tab-business', False),
        ('09_환경_보건_안전_보안.csv', '환경/안전', 'tab-safety', False),
    ]

    sections = []
    total_items = 0
    ceo_items = 0

    for file_info in file_order:
        filename, display_name, tab_id, is_preface = file_info
        file_path = KNOWLEDGE_BASE_DIR / filename
        if file_path.exists():
            # 서문은 특별 파싱 함수 사용
            if is_preface:
                data = parse_preface_csv(file_path)
            else:
                data = parse_csv_file(file_path)
            if data:
                # 레벨 정보 추가
                for rule in data['rules']:
                    rule['level'] = determine_level(rule['item'])

                    # approver에 CSS 클래스 추가 (정렬하지 않고 입력 순서 유지)
                    for approver in rule['approvers']:
                        approver['css_class'] = get_approver_class(approver['role'])
                        if 'symbol' in approver:
                            approver['symbol_class'] = get_symbol_class(approver['symbol'])
                            approver['symbol_text'] = get_symbol_text(approver['symbol'])

                sections.append({
                    'tab_id': tab_id,
                    'display_name': display_name,
                    'data': data
                })
                total_items += len(data['rules'])

                # CEO 전결 항목 카운트
                for rule in data['rules']:
                    for approver in rule['approvers']:
                        if approver['role'] == 'CEO' and approver.get('symbol') == '◎':
                            ceo_items += 1
                            break

    # 조직도 파일 읽기
    org_file = KNOWLEDGE_BASE_DIR / '조직도_structured.txt'
    org_data = None
    if org_file.exists():
        with open(org_file, 'r', encoding='utf-8') as f:
            org_content = f.read()
            # 조직도는 별도 파싱 로직 필요 (간단하게 텍스트로 표시)
            org_data = org_content

    # 결재라인 가이드 파일 읽기
    guide_file = KNOWLEDGE_BASE_DIR / '결재라인_가이드_structured.txt'
    guide_data = None
    if guide_file.exists():
        with open(guide_file, 'r', encoding='utf-8') as f:
            guide_content = f.read()
            guide_data = guide_content

    return render_template('index.html',
                         sections=sections,
                         total_items=total_items,
                         ceo_items=ceo_items,
                         org_data=org_data,
                         guide_data=guide_data)


@app.route('/api/search')
def search():
    """검색 API (필요시 구현)"""
    # TODO: 검색 기능 구현
    return jsonify({"status": "ok"})


@app.route('/api/chat', methods=['POST'])
def chat():
    """Miso AI 챗봇 API"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        conversation_id = data.get('conversation_id', '')

        if not user_message:
            return jsonify({"error": "메시지를 입력해주세요."}), 400

        # 환경 변수에서 API 설정 가져오기
        api_url = os.getenv('MISO_API_URL')
        api_key = os.getenv('MISO_API_KEY')

        if not api_url or not api_key:
            return jsonify({"error": "Miso API 설정이 필요합니다."}), 500

        # Miso API 요청 페이로드
        payload = {
            "inputs": {},
            "query": user_message,
            "response_mode": "blocking",
            "user": "web_user"  # 고정 사용자 ID
        }

        # conversation_id가 있을 때만 추가
        if conversation_id:
            payload["conversation_id"] = conversation_id

        # Miso API 호출
        response = requests.post(
            f"{api_url}/chat",
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            json=payload,
            timeout=60
        )

        if not response.ok:
            error_text = response.text
            return jsonify({
                "error": f"Miso API 오류: {response.status_code}",
                "details": error_text
            }), response.status_code

        result = response.json()

        # 응답에서 메시지와 conversation_id 추출
        assistant_message = result.get('answer', '응답을 받을 수 없습니다.')
        new_conversation_id = result.get('conversation_id', '')

        return jsonify({
            "success": True,
            "message": assistant_message,
            "conversation_id": new_conversation_id,
            "sources": result.get('metadata', {}).get('sources', [])
        })

    except requests.exceptions.Timeout:
        return jsonify({"error": "요청 시간이 초과되었습니다. 다시 시도해주세요."}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"네트워크 오류: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"AI 응답 생성 중 오류가 발생했습니다: {str(e)}"}), 500


if __name__ == '__main__':
    # 템플릿 자동 리로드 활성화
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.jinja_env.auto_reload = True

    print("=" * 60)
    print("위드인천에너지 전결규정 시스템 시작")
    print("=" * 60)
    print("\n[등록된 라우트]")
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
        print(f"  {rule.rule:30s} [{methods}]")
    print("\n웹 브라우저에서 http://localhost:5000 접속\n")
    print("종료하려면 Ctrl+C 누르세요\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
