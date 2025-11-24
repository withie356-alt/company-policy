"""
위드인천에너지 전결규정 웹 애플리케이션
knowledge_base 폴더의 파일들을 동적으로 읽어서 표시
"""

from flask import Flask, render_template, jsonify, request
import os
import re
from pathlib import Path
from dotenv import load_dotenv
import requests
import time

# 환경 변수 로드
load_dotenv()

app = Flask(__name__)

# knowledge_base 폴더 경로
KNOWLEDGE_BASE_DIR = Path(__file__).parent / 'knowledge_base'


def parse_structured_file(file_path):
    """structured.txt 파일 파싱"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # [BEGIN_RULES]와 [END_RULES] 사이의 내용 추출
    match = re.search(r'\[BEGIN_RULES\](.*?)\[END_RULES\]', content, re.DOTALL)
    if not match:
        return None

    rules_text = match.group(1)

    # 메타데이터 추출
    section_match = re.search(r'section:\s*"([^"]+)"', rules_text)
    version_match = re.search(r'version:\s*"([^"]+)"', rules_text)
    notes_match = re.search(r'notes:\s*"([^"]+)"', rules_text)

    section = section_match.group(1) if section_match else ""
    version = version_match.group(1) if version_match else ""
    notes = notes_match.group(1) if notes_match else ""

    # annotations 파싱
    annotations = {}
    common_annotations = []  # 공통 주석 (ref가 "공통"으로 시작하는 것들)
    annotations_pattern = r'annotations:\s*((?:\s*-\s+ref:.*?(?=\s*-\s+ref:|\[END_RULES\]|\Z))+)'
    annotations_match = re.search(annotations_pattern, rules_text, re.DOTALL)

    if annotations_match:
        annotations_text = annotations_match.group(1)
        # 각 annotation 항목 파싱
        annotation_item_pattern = r'-\s+ref:\s*"([^"]+)"\s+text:\s*"([^"]+(?:\n(?!\s*-\s+ref:)[^"]+)*)"'
        for ann_match in re.finditer(annotation_item_pattern, annotations_text, re.DOTALL):
            ref = ann_match.group(1).strip()
            text = ann_match.group(2).strip()
            # \n을 실제 줄바꿈으로 변환
            text = text.replace('\\n', '\n')

            # ref가 "공통"으로 시작하거나 숫자로 시작하지 않으면 공통 주석
            if ref.startswith('공통') or not re.match(r'^\d', ref):
                # ref에서 키워드 추출 (예: "공통-금융" -> "금융", "공통-지출" -> "지출")
                keyword = ref.split('-')[-1] if '-' in ref else ref
                common_annotations.append({'ref': ref, 'keyword': keyword, 'text': text})
            else:
                annotations[ref] = text

    # 규칙들 파싱
    rules = []
    rule_pattern = r'-\s+item:\s*"([^"]+(?:\n[^"]+)*)"\s+approver_line:\s*\[(.*?)\](?:\s+notes:\s*"([^"]+(?:\n[^"]+)*)")?'

    for match in re.finditer(rule_pattern, rules_text, re.DOTALL):
        item = match.group(1).replace('\n', ' ').strip()
        approver_line_str = match.group(2)
        notes_text = match.group(3) if match.group(3) else ""
        notes_text = notes_text.replace('\n', ' ').strip() if notes_text else "-"

        # approver_line 파싱
        approvers = []
        if approver_line_str.strip():
            approver_matches = re.findall(r'"([^"]+)"', approver_line_str)
            for approver in approver_matches:
                # 줄바꿈 문자를 공백으로 정규화
                approver = approver.replace('\n', ' ').strip()

                # 결재권자와 기호 분리 (예: "CEO(◎)" -> {"role": "CEO", "symbol": "◎"})
                role_match = re.match(r'(.+?)\(([◎○□★→])\)', approver)
                if role_match:
                    role = role_match.group(1).strip()
                    symbol = role_match.group(2)
                    approvers.append({"role": role, "symbol": symbol})
                else:
                    # 조건부 결재 (예: "CEO(1억원 초과)")
                    condition_match = re.match(r'(.+?)\((.+)\)', approver)
                    if condition_match:
                        role = condition_match.group(1).strip()
                        condition = condition_match.group(2).replace('\n', ' ').strip()
                        # 조건만 있는 경우 기본 심볼을 '◎'(전결)로 설정
                        approvers.append({"role": role, "condition": condition, "symbol": "◎"})
                    else:
                        # 심볼과 조건이 없는 경우에도 기본 심볼을 '◎'(전결)로 설정
                        approvers.append({"role": approver.strip(), "symbol": "◎"})

        # 항목 번호 추출 (예: "3.1 주주총회 의결권 지시(*)" -> "3.1")
        item_num_match = re.match(r'(\d+(?:\.\d+)*)', item)
        item_num = item_num_match.group(1) if item_num_match else None

        # 해당 항목의 annotation 찾기
        annotation_text = annotations.get(item_num, None) if item_num else None

        # 절 제목 판별: "[4-1 자금]" 같은 형태
        is_section_title = bool(re.match(r'^\[\d+-\d+\s+.+\]$', item))

        rules.append({
            "item": item,
            "approvers": approvers,
            "notes": notes_text,
            "annotation": annotation_text,
            "is_section_title": is_section_title
        })

    return {
        "section": section,
        "version": version,
        "notes": notes,
        "rules": rules,
        "common_annotations": common_annotations
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

    # 파일 순서 정의
    file_order = [
        ('01_경영관리_structured.txt', '경영관리', 'tab-management'),
        ('02_예산_structured.txt', '예산', 'tab-budget'),
        ('03_구매_structured.txt', '구매', 'tab-purchase'),
        ('04_재무_structured.txt', '재무', 'tab-finance'),
        ('05_자산관리_structured.txt', '자산관리', 'tab-asset'),
        ('06_인사_총무_structured.txt', '인사/총무', 'tab-hr'),
        ('07_법제_법무_structured.txt', '법제/법무', 'tab-legal'),
        ('08_사업개발_생산_홍보_structured.txt', '사업개발', 'tab-business'),
        ('09_환경_보건_안전_보안_structured.txt', '환경/안전', 'tab-safety'),
    ]

    sections = []
    total_items = 0
    ceo_items = 0

    for filename, display_name, tab_id in file_order:
        file_path = KNOWLEDGE_BASE_DIR / filename
        if file_path.exists():
            data = parse_structured_file(file_path)
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
            "mode": "blocking",
            "conversation_id": conversation_id,
            "user": f"user_{int(time.time())}"
        }

        # Miso API 호출
        response = requests.post(
            f"{api_url}/chat",
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            json=payload,
            timeout=30
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
