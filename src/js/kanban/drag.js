import changeItemsCount from './changeItemsCount';

export default function drag(main, el) {
  let draggedEl = null;
  let placeholder = null;
  let shiftX, shiftY;
  let currentColumn = null;

  function createPlaceholder(height) {
    const ph = document.createElement('div');
    ph.className = 'kanban-placeholder';
    ph.style.height = `${height}px`;
    return ph;
  }

  function getDropPosition(column, clientY) {
    const items = column.querySelectorAll('.main-kanban-item:not(.dragged)');
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const itemMiddle = rect.top + rect.height / 2;

      if (clientY < itemMiddle) {
        return {
          element: item,
          position: 'before'
        };
      }
    }
    return {
      element: column,
      position: 'last'
    };
  }

  function updatePlaceholder(position) {
    if (!placeholder) return;

    if (position.position === 'before') {
      position.element.parentNode.insertBefore(placeholder, position.element);
    } else {
      position.element.appendChild(placeholder);
    }
  }

  function resetState() {
    if (placeholder && placeholder.parentNode) {
      placeholder.remove();
    }
    if (draggedEl) {
      draggedEl.style.position = '';
      draggedEl.style.left = '';
      draggedEl.style.top = '';
      draggedEl.style.zIndex = '';
      draggedEl.classList.remove('dragged');
    }
    draggedEl = null;
    placeholder = null;
  }

  el.addEventListener('mousedown', (e) => {
    if (e.target.dataset.toggle === 'item-remove') return;
    e.preventDefault();

    draggedEl = e.currentTarget;
    currentColumn = draggedEl.closest('.main-kanban-column');
    shiftX = e.clientX - draggedEl.getBoundingClientRect().left;
    shiftY = e.clientY - draggedEl.getBoundingClientRect().top;

    // Создаем плейсхолдер
    placeholder = createPlaceholder(draggedEl.offsetHeight);
    draggedEl.parentNode.insertBefore(placeholder, draggedEl);

    // Настройка стилей перетаскиваемого элемента
    draggedEl.style.position = 'absolute';
    draggedEl.style.zIndex = '1000';
    draggedEl.classList.add('dragged');
    document.body.appendChild(draggedEl);
    moveAt(e);

    function moveAt(e) {
      draggedEl.style.left = `${e.pageX - shiftX}px`;
      draggedEl.style.top = `${e.pageY - shiftY}px`;

      // Обновление позиции плейсхолдера
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const column = dropTarget?.closest('.main-kanban-column');
      const columnItems = column?.querySelector('.main-kanban-column-items');

      if (columnItems) {
        const position = getDropPosition(columnItems, e.clientY);
        updatePlaceholder(position);
      }
    }

    function onMouseUp(e) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (!draggedEl) return;

      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const column = dropTarget?.closest('.main-kanban-column');
      const columnItems = column?.querySelector('.main-kanban-column-items');

      if (columnItems) {
        const position = getDropPosition(columnItems, e.clientY);
        if (position.position === 'before') {
          columnItems.insertBefore(draggedEl, position.element);
        } else {
          columnItems.appendChild(draggedEl);
        }

        // Обновляем localStorage только если колонка изменилась
        if (column !== currentColumn) {
          updateLocalStorage(draggedEl, column.dataset.id);
        }
      }

      resetState();
    }

    function onMouseMove(e) {
      moveAt(e);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function updateLocalStorage(element, newColumnId) {
    if (!localStorage.columns) return;

    const columns = JSON.parse(localStorage.columns);
    const oldColumnId = currentColumn.dataset.id;

    if (!columns[oldColumnId]) return;

    const itemId = +element.dataset.id;
    const itemIndex = columns[oldColumnId].findIndex(item => item.id === itemId);

    if (itemIndex === -1) return;

    const [movedItem] = columns[oldColumnId].splice(itemIndex, 1);

    if (!columns[newColumnId]) {
      columns[newColumnId] = [];
    }
    columns[newColumnId].push(movedItem);

    localStorage.setItem('columns', JSON.stringify(columns));
    changeItemsCount(currentColumn, columns[oldColumnId]);
    changeItemsCount(document.querySelector(`[data-id="${newColumnId}"]`), columns[newColumnId]);
  }

  // Защита от потери события
  document.addEventListener('mouseleave', resetState);
}
