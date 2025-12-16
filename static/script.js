// 전결규정 HTML 변환 - JavaScript 기능 (개선 버전)

// 전역 변수
let allRules = [];
let currentTab = 'all';
let searchResults = [];

// 페이지 로드 시 스크롤 위치 초기화
if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  window.scrollTo(0, 0); // 맨 위로 스크롤
  initializeTabs();
  initializeSearch();
  initializeScrollToTop();
  initializeChapterAccordion();
  collectAllRules();
  showAllItems();
});

// 탭 초기화
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // 첫 번째 탭 활성화
  if (tabButtons.length > 0) {
    switchTab(tabButtons[0].getAttribute('data-tab'));
  }
}

// 탭 전환
function switchTab(tabId) {
  currentTab = tabId;

  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 모든 탭 컨텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // 선택된 탭 활성화
  const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const selectedContent = document.getElementById(tabId);

  if (selectedButton) selectedButton.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');

  // 검색어가 있으면 검색 재실행
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value.trim()) {
    applySearch();
  } else {
    hideSearchResults();
  }
}

// 검색 기능 초기화
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const clearButton = document.getElementById('clearButton');

  if (searchInput) {
    // 입력 중 X 버튼 표시/숨김
    searchInput.addEventListener('input', function() {
      if (clearButton) {
        clearButton.style.display = this.value.trim() ? 'flex' : 'none';
      }
    });

    // 엔터키로 검색 실행
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        applySearch();
      }
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', function(e) {
      e.preventDefault();
      applySearch();
    });
  }

  if (clearButton && searchInput) {
    clearButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Clear button clicked');
      searchInput.value = '';
      clearButton.style.display = 'none';
      showAllItems();
      hideSearchResults();
      searchInput.focus();
    });
  }
}

// 맨 위로 버튼 초기화
function initializeScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');

  if (scrollBtn) {
    // 스크롤 이벤트 감지
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        scrollBtn.classList.add('show');
      } else {
        scrollBtn.classList.remove('show');
      }
    });

    // 클릭 시 맨 위로 이동
    scrollBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// 장 아코디언 초기화
function initializeChapterAccordion() {
  // 기존 chapter-section 처리 (개별 탭용)
  const chapterSections = document.querySelectorAll('.chapter-section');

  chapterSections.forEach(section => {
    const header = section.querySelector('.chapter-header');
    const content = section.querySelector('.chapter-content');

    // 초기 상태: 모든 장 접기
    if (header && content) {
      header.classList.add('collapsed');
      content.classList.add('collapsed');
    }

    // 박스 전체 클릭 이벤트
    section.addEventListener('click', function(e) {
      // 테이블 내부 클릭은 무시
      if (e.target.closest('.approval-table')) {
        return;
      }

      if (header && content) {
        // 토글
        header.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      }
    });
  });

  // 카드 형식 처리 (전체 탭용)
  const chapterCards = document.querySelectorAll('.chapter-card');

  chapterCards.forEach(card => {
    card.addEventListener('click', function() {
      const chapterNum = this.getAttribute('data-chapter');
      const title = this.getAttribute('data-title');

      // 모든 카드에서 active 클래스 제거
      chapterCards.forEach(c => c.classList.remove('active'));

      // 현재 카드에 active 클래스 추가
      this.classList.add('active');

      // 콘텐츠 데이터 가져오기
      const contentData = document.getElementById('content-data-' + chapterNum);
      const expandedContent = document.getElementById('expanded-content');
      const expandedTitle = document.getElementById('expanded-title');
      const expandedBody = document.getElementById('expanded-body');

      if (contentData && expandedContent) {
        // 제목 설정
        expandedTitle.textContent = title;

        // 콘텐츠 복사
        expandedBody.innerHTML = contentData.innerHTML;

        // 펼쳐진 영역 표시
        expandedContent.style.display = 'block';

        // 스크롤 이동
        expandedContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// 펼쳐진 콘텐츠 닫기
function closeExpandedContent() {
  const expandedContent = document.getElementById('expanded-content');
  const chapterCards = document.querySelectorAll('.chapter-card');

  if (expandedContent) {
    expandedContent.style.display = 'none';
  }

  // 모든 카드에서 active 클래스 제거
  chapterCards.forEach(c => c.classList.remove('active'));
}

// 특정 장 열기
function openChapter(chapterElement) {
  const chapterSection = chapterElement.closest('.chapter-section');
  if (chapterSection) {
    const header = chapterSection.querySelector('.chapter-header');
    const content = chapterSection.querySelector('.chapter-content');

    if (header && content) {
      // 다른 모든 장 닫기
      document.querySelectorAll('.chapter-header').forEach(h => {
        h.classList.add('collapsed');
      });
      document.querySelectorAll('.chapter-content').forEach(c => {
        c.classList.add('collapsed');
      });

      // 해당 장만 열기
      header.classList.remove('collapsed');
      content.classList.remove('collapsed');
    }
  }
}

// 모든 규칙 수집
function collectAllRules() {
  allRules = [];
  const tables = document.querySelectorAll('.approval-table tbody');

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr:not(.section-header)');
    rows.forEach(row => {
      const itemCell = row.querySelector('.item-name');
      const approverCell = row.querySelector('.approver-list');
      const notesCell = row.querySelector('.notes');

      if (itemCell) {
        const chapter = row.getAttribute('data-chapter') || '';
        const section = row.getAttribute('data-section') || '';

        allRules.push({
          element: row,
          item: itemCell.textContent.trim(),
          approvers: approverCell ? approverCell.textContent.trim() : '',
          notes: notesCell ? notesCell.textContent.trim() : '',
          chapter: chapter,
          section: section,
          table: table
        });
      }
    });
  });

  console.log(`Collected ${allRules.length} rules`);
}

// 검색 적용 (개선된 버전 - 항목 필터링 없이 검색 결과만 표시)
function applySearch() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

  console.log(`Searching for: "${searchTerm}"`);

  if (!searchTerm) {
    showAllItems();
    hideSearchResults();
    return;
  }

  let matchCount = 0;
  searchResults = [];

  // 현재 활성화된 탭의 테이블에서 검색
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) {
    console.log('No active tab found');
    return;
  }

  // 전체 탭일 경우 숨겨진 content-data에서 검색
  let tables;
  if (activeTab.id === 'tab-all') {
    tables = activeTab.querySelectorAll('.content-data .approval-table tbody');
  } else {
    tables = activeTab.querySelectorAll('.approval-table tbody');
  }

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      // 섹션 헤더는 건너뛰기
      if (row.classList.contains('section-header')) {
        return;
      }

      const itemCell = row.querySelector('.item-name');
      const approverCell = row.querySelector('.approver-list');
      const notesCell = row.querySelector('.notes');

      if (!itemCell) {
        return;
      }

      const itemText = itemCell.textContent.toLowerCase();
      const approverText = approverCell ? approverCell.textContent.toLowerCase() : '';
      const notesText = notesCell ? notesCell.textContent.toLowerCase() : '';
      const fullText = itemText + ' ' + approverText + ' ' + notesText;

      // 검색어 매칭
      const matchesSearch = fullText.includes(searchTerm);

      if (matchesSearch) {
        matchCount++;

        // 검색 결과 저장
        let chapter = null;
        let section = row.getAttribute('data-section') || '알 수 없음';

        // content-data에서 chapter 정보 가져오기 (항상)
        const contentData = row.closest('.content-data');
        if (contentData && contentData.id) {
          chapter = contentData.id.replace('content-data-', '');
        }

        searchResults.push({
          row: row,
          item: itemCell.textContent.trim(),
          approvers: approverCell ? approverCell.textContent.trim() : '-',
          chapter: chapter || '?',
          section: section
        });
      }
    });
  });

  console.log(`Found ${matchCount} matches`);

  // 검색 결과 표시 (하단 항목은 필터링하지 않음)
  showSearchResults(matchCount, searchTerm);
}

// 모든 항목 표시
function showAllItems() {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;

  const tables = activeTab.querySelectorAll('.approval-table tbody');

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      row.style.display = '';

      // 하이라이트 제거
      const itemCell = row.querySelector('.item-name');
      const approverCell = row.querySelector('.approver-list');
      const notesCell = row.querySelector('.notes');

      if (itemCell) removeHighlight(itemCell);
      if (approverCell) removeHighlight(approverCell);
      if (notesCell) removeHighlight(notesCell);
    });
  });
}

// 검색 결과 표시 (상세 리스트 포함)
function showSearchResults(count, searchTerm) {
  const resultsDiv = document.getElementById('searchResults');
  const countSpan = document.getElementById('resultCount');
  const summaryDiv = document.getElementById('resultSummary');
  const listDiv = document.getElementById('resultList');

  if (!resultsDiv || !countSpan || !summaryDiv || !listDiv) return;

  resultsDiv.style.display = 'block';
  countSpan.textContent = count;

  if (count === 0) {
    summaryDiv.innerHTML = `<span style="color: #dc2626;">\"${searchTerm}\"에 대한 검색 결과가 없습니다.</span>`;
    listDiv.innerHTML = '';
  } else {
    summaryDiv.innerHTML = `검색어 \"<strong>${searchTerm}</strong>\"를 포함하는 항목입니다. 클릭하여 이동하세요.`;

    // 결과 리스트 생성
    listDiv.innerHTML = searchResults.map((result, index) => `
      <div class="result-item" data-index="${index}">
        <div class="result-item-title">${escapeHtml(result.item)}</div>
        <div class="result-item-meta">
          제${result.chapter}장 ${result.section} • 결재권자: ${escapeHtml(result.approvers)}
        </div>
      </div>
    `).join('');

    // 클릭 이벤트 바인딩
    listDiv.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        scrollToResult(idx);
      });
    });
  }
}

// 검색 결과로 스크롤 이동
function scrollToResult(index) {
  console.log('scrollToResult called with index:', index);

  if (index >= 0 && index < searchResults.length) {
    const result = searchResults[index];
    const chapterNum = result.chapter;

    console.log('Result:', result);
    console.log('Chapter:', chapterNum);

    // 전체 탭의 카드 형식인지 확인
    const activeTab = document.querySelector('.tab-content.active');
    const isAllTab = activeTab && activeTab.id === 'tab-all';

    console.log('Is All Tab:', isAllTab);

    if (isAllTab) {
      // 카드 형식: 해당 chapter 카드 클릭하여 펼치기
      const card = document.querySelector('.chapter-card[data-chapter="' + chapterNum + '"]');
      console.log('Found card:', card);

      if (card) {
        // 모든 카드에서 active 제거
        document.querySelectorAll('.chapter-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        // 콘텐츠 데이터 가져와서 표시
        const contentData = document.getElementById('content-data-' + chapterNum);
        const expandedContent = document.getElementById('expanded-content');
        const expandedTitle = document.getElementById('expanded-title');
        const expandedBody = document.getElementById('expanded-body');

        console.log('Content data:', contentData);

        if (contentData && expandedContent) {
          expandedTitle.textContent = card.getAttribute('data-title');
          expandedBody.innerHTML = contentData.innerHTML;
          expandedContent.style.display = 'block';

          // 펼쳐진 영역으로 스크롤
          expandedContent.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // 해당 항목 찾아서 스크롤 및 하이라이트
          setTimeout(() => {
            const itemText = result.item;
            const rows = expandedBody.querySelectorAll('tr');

            console.log('Looking for item:', itemText, 'in', rows.length, 'rows');

            for (let row of rows) {
              const itemCell = row.querySelector('.item-name');
              if (itemCell && itemCell.textContent.trim() === itemText) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 모든 td에 하이라이트 적용 (밝은 파란색)
                const cells = row.querySelectorAll('td');
                cells.forEach(cell => cell.style.background = '#93c5fd');
                setTimeout(() => {
                  cells.forEach(cell => cell.style.background = '');
                }, 2500);
                break;
              }
            }
          }, 300);
        }
      }
    } else {
      // 기존 방식: 개별 장 탭
      openChapter(result.row);

      setTimeout(() => {
        result.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        result.row.style.background = '#fef08a';
        setTimeout(() => {
          result.row.style.background = '';
        }, 2000);
      }, 100);
    }
  }
}

// 검색 결과 숨기기
function hideSearchResults() {
  const resultsDiv = document.getElementById('searchResults');
  if (resultsDiv) {
    resultsDiv.style.display = 'none';
  }
  searchResults = [];
}

// 텍스트 하이라이트
function highlightText(element, searchTerm) {
  if (!element || !searchTerm) return;

  // 원본 텍스트 저장
  if (!element.dataset.originalHtml) {
    element.dataset.originalHtml = element.innerHTML;
  }

  const text = element.dataset.originalHtml;
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');

  // 새로운 하이라이트 적용
  const highlightedText = text.replace(regex, '<mark class="highlight">$1</mark>');
  element.innerHTML = highlightedText;
}

// 하이라이트 제거
function removeHighlight(element) {
  if (!element) return;

  if (element.dataset.originalHtml) {
    element.innerHTML = element.dataset.originalHtml;
  }
}

// 정규식 특수문자 이스케이프
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 배지 클릭 시 상세 정보 표시
function showApprovalDetail(badge) {
  const role = badge.getAttribute('data-role');
  const symbol = badge.getAttribute('data-symbol');
  const condition = badge.getAttribute('data-condition');

  // 부모 행에서 항목 정보 가져오기
  const row = badge.closest('tr');
  const item = row.querySelector('.item-name').textContent.trim();
  const notes = row.querySelector('.notes').textContent.trim();
  const chapter = row.getAttribute('data-chapter') || '?';
  const section = row.getAttribute('data-section') || '알 수 없음';

  // 모달 내용 생성
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = '결재 상세 정보';

  modalBody.innerHTML = `
    <div class="modal-info-row">
      <div class="modal-info-label">📋 항목</div>
      <div class="modal-info-value">${escapeHtml(item)}</div>
    </div>
    <div class="modal-info-row">
      <div class="modal-info-label">👤 결재권자</div>
      <div class="modal-info-value"><strong>${escapeHtml(role)}</strong></div>
    </div>
    ${symbol ? `
      <div class="modal-info-row">
        <div class="modal-info-label">✅ 결재 유형</div>
        <div class="modal-info-value"><strong style="color: #dc2626;">${escapeHtml(symbol)}</strong></div>
      </div>
    ` : ''}
    ${condition ? `
      <div class="modal-info-row">
        <div class="modal-info-label">💰 조건</div>
        <div class="modal-info-value">${escapeHtml(condition)}</div>
      </div>
    ` : ''}
    <div class="modal-info-row">
      <div class="modal-info-label">📝 참고사항</div>
      <div class="modal-info-value">${escapeHtml(notes)}</div>
    </div>
  `;

  openModal();
}

// 모달 열기
function openModal() {
  const modal = document.getElementById('approvalModal');
  if (modal) {
    modal.classList.add('show');
  }
}

// 모달 닫기
function closeModal() {
  const modal = document.getElementById('approvalModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', function(e) {
  const modal = document.getElementById('approvalModal');
  if (e.target === modal) {
    closeModal();
  }
});

// ESC 키로 모달 닫기
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// 전체 초기화 (필요시)
function resetFilters() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
  }

  const clearButton = document.getElementById('clearButton');
  if (clearButton) {
    clearButton.style.display = 'none';
  }

  showAllItems();
  hideSearchResults();
}

// 인쇄 기능
function printPage() {
  window.print();
}

// 엑셀 내보내기 (간단한 CSV)
function exportToCSV() {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;

  const tables = activeTab.querySelectorAll('.approval-table');
  if (tables.length === 0) return;

  let csv = '\uFEFF'; // UTF-8 BOM

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      const rowData = Array.from(cells).map(cell => {
        let text = cell.textContent.trim();
        text = text.replace(/"/g, '""'); // 따옴표 이스케이프
        return `"${text}"`;
      });

      csv += rowData.join(',') + '\n';
    });
  });

  // 파일 다운로드
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `전결규정_${currentTab}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== AI 챗봇 기능 ====================

let conversationId = ''; // 대화 세션 ID

// DOM 요소
const chatbotButton = document.getElementById('chatbotButton');
const chatbotWindow = document.getElementById('chatbotWindow');
const closeChatbot = document.getElementById('closeChatbot');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessage = document.getElementById('sendMessage');

// 챗봇 창 열기/닫기
chatbotButton.addEventListener('click', () => {
  chatbotWindow.style.display = 'flex';
  chatbotButton.style.display = 'none';
  chatInput.focus();
});

closeChatbot.addEventListener('click', () => {
  chatbotWindow.style.display = 'none';
  chatbotButton.style.display = 'flex';
});

// 메시지 추가 함수
function addMessage(text, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;

  const now = new Date();
  const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  messageDiv.innerHTML = `
    <div class="message-content">
      <div class="message-text">${text}</div>
      <div class="message-time">${timeString}</div>
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 타이핑 인디케이터 추가
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message bot-message';
  typingDiv.id = 'typingIndicator';

  typingDiv.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 타이핑 인디케이터 제거
function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// 메시지 전송 함수
async function sendChatMessage() {
  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  // 사용자 메시지 추가
  addMessage(message, true);
  chatInput.value = '';

  // 전송 버튼 비활성화
  sendMessage.disabled = true;
  chatInput.disabled = true;

  // 타이핑 인디케이터 표시
  showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        conversation_id: conversationId
      }),
    });

    const data = await response.json();

    // 타이핑 인디케이터 제거
    hideTypingIndicator();

    if (response.ok && data.success) {
      // AI 응답 추가
      addMessage(data.message, false);

      // conversation_id 업데이트
      if (data.conversation_id) {
        conversationId = data.conversation_id;
      }
    } else {
      // 오류 메시지 표시
      const errorMessage = data.error || '응답을 받을 수 없습니다.';
      addMessage(`❌ ${errorMessage}`, false);
    }
  } catch (error) {
    hideTypingIndicator();
    addMessage('❌ 네트워크 오류가 발생했습니다. 다시 시도해주세요.', false);
    console.error('Chat error:', error);
  } finally {
    // 전송 버튼 활성화
    sendMessage.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
}

// 전송 버튼 클릭
sendMessage.addEventListener('click', sendChatMessage);

// 엔터 키로 전송
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});
