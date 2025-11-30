document.addEventListener('DOMContentLoaded', function() {
  const typeContainer = document.querySelector('footer p');
  if (!typeContainer) return;

  const speed = 50; // Typing speed in milliseconds
  const originalNodes = Array.from(typeContainer.childNodes);
  typeContainer.textContent = ''; // Clear the container safely

  let parentElement = typeContainer;
  const timeouts = new Set();
  let blinkInterval = null;
  let cancelled = false;

  const cancelAll = () => {
    cancelled = true;
    timeouts.forEach(id => clearTimeout(id));
    timeouts.clear();
    if (blinkInterval) {
      clearInterval(blinkInterval);
      blinkInterval = null;
    }
  };

  async function typeWriter(nodes) {
    for (const node of nodes) {
      if (cancelled || !typeContainer.isConnected) return;

      if (node.nodeType === Node.ELEMENT_NODE) {
        const newElement = document.createElement(node.nodeName);
        node.getAttributeNames().forEach(attr => {
          newElement.setAttribute(attr, node.getAttribute(attr));
        });
        parentElement.appendChild(newElement);

        if (node.childNodes.length > 0) {
          const oldParent = parentElement;
          parentElement = newElement;
          await typeWriter(Array.from(node.childNodes));
          parentElement = oldParent;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        await typeText(node.textContent);
      }
    }
  }

  function typeText(text) {
    return new Promise(resolve => {
      if (cancelled || !typeContainer.isConnected) return resolve();

      let i = 0;
      const textNode = document.createTextNode('');
      parentElement.appendChild(textNode);

      function typeChar() {
        if (cancelled || !typeContainer.isConnected) {
          return resolve();
        }
        if (i < text.length) {
          textNode.textContent += text.charAt(i);
          i++;
          const id = setTimeout(typeChar, speed);
          timeouts.add(id);
        } else {
          resolve();
        }
      }
      const id = setTimeout(typeChar, speed);
      timeouts.add(id);
    });
  }

  function addCursorAndBlink() {
    if (cancelled || !typeContainer.isConnected) return;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '█';
    typeContainer.appendChild(cursor);

    let blinks = 0;
    blinkInterval = setInterval(() => {
      if (!cursor.isConnected) return cancelAll();
      cursor.style.visibility = cursor.style.visibility === 'hidden' ? 'visible' : 'hidden';
      blinks++;
      if (blinks > 8) { // 4 full blinks
        clearInterval(blinkInterval);
        blinkInterval = null;
        cursor.remove();
      }
    }, 500);
  }

  const handleTeardown = () => cancelAll();
  window.addEventListener('beforeunload', handleTeardown);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAll();
  });

  typeWriter(originalNodes).then(() => {
    if (!cancelled) addCursorAndBlink();
    window.removeEventListener('beforeunload', handleTeardown);
  });
});
