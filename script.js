// 전결규정 HTML 변환 - JavaScript 기능 (검색 중심 개선 버전)

// 전역 변수
let allRules = [];
let currentTab = 'all';

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  initializeTabs();
  initializeSearch();
  collectAllRules();

  // 첫 화면에서는 모든 항목 표시
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

  // 검색어가 있으면 검색 유지, 없으면 전체 표시
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value.trim()) {
    applySearch();
  } else {
    showAllItems();
  }
}

// 검색 기능 초기화
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  if (searchInput) {
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
        allRules.push({
          element: row,
          item: itemCell.textContent.trim(),
          approvers: approverCell ? approverCell.textContent.trim() : '',
          notes: notesCell ? notesCell.textContent.trim() : '',
          table: table
        });
      }
    });
  });

  console.log(`Collected ${allRules.length} rules`);
}

// 검색 적용 (개선된 버전)
function applySearch() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

  console.log(`Searching for: "${searchTerm}"`);

  if (!searchTerm) {
    // 검색어가 없으면 전체 표시
    showAllItems();
    hideSearchResults();
    return;
  }

  let visibleCount = 0;
  let totalCount = 0;
  let matchedSections = new Set();

  // 현재 활성화된 탭의 테이블만 필터링
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) {
    console.log('No active tab found');
    return;
  }

  const tables = activeTab.querySelectorAll('.approval-table tbody');

  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      // 섹션 헤더는 항상 표시
      if (row.classList.contains('section-header')) {
        row.style.display = '';
        return;
      }

      totalCount++;

      const itemCell = row.querySelector('.item-name');
      const approverCell = row.querySelector('.approver-list');
      const notesCell = row.querySelector('.notes');

      if (!itemCell) {
        row.style.display = 'none';
        return;
      }

      const itemText = itemCell.textContent.toLowerCase();
      const approverText = approverCell ? approverCell.textContent.toLowerCase() : '';
      const notesText = notesCell ? notesCell.textContent.toLowerCase() : '';
      const fullText = itemText + ' ' + approverText + ' ' + notesText;

      // 검색어 매칭
      const matchesSearch = fullText.includes(searchTerm);

      if (matchesSearch) {
        row.style.display = '';
        visibleCount++;

        // 하이라이트 적용
        highlightText(itemCell, searchTerm);
        if (approverCell) highlightText(approverCell, searchTerm);
        if (notesCell) highlightText(notesCell, searchTerm);

        // 매칭된 섹션 추적 (탭 이름)
        const tabContent = row.closest('.tab-content');
        if (tabContent) {
          const tabTitle = tabContent.querySelector('h2');
          if (tabTitle) {
            matchedSections.add(tabTitle.textContent.trim());
          }
        }
      } else {
        row.style.display = 'none';

        // 하이라이트 제거
        removeHighlight(itemCell);
        if (approverCell) removeHighlight(approverCell);
        if (notesCell) removeHighlight(notesCell);
      }
    });
  });

  console.log(`Visible: ${visibleCount}, Total: ${totalCount}`);

  // 검색 결과 표시
  showSearchResults(visibleCount, searchTerm, matchedSections);
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

// 검색 결과 표시
function showSearchResults(count, searchTerm, matchedSections) {
  const resultsDiv = document.getElementById('searchResults');
  const countSpan = document.getElementById('resultCount');
  const summaryDiv = document.getElementById('resultSummary');

  if (!resultsDiv || !countSpan || !summaryDiv) return;

  resultsDiv.style.display = 'block';
  countSpan.textContent = count;

  if (count === 0) {
    summaryDiv.innerHTML = `<span style="color: #dc2626;">"${searchTerm}"에 대한 검색 결과가 없습니다.</span>`;
  } else {
    const sectionList = Array.from(matchedSections).join(', ');
    summaryDiv.innerHTML = `검색어 "<strong>${searchTerm}</strong>"를 포함하는 항목을 찾았습니다.`;
  }
}

// 검색 결과 숨기기
function hideSearchResults() {
  const resultsDiv = document.getElementById('searchResults');
  if (resultsDiv) {
    resultsDiv.style.display = 'none';
  }
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

// 전체 초기화 (필요시)
function resetFilters() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
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
