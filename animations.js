document.addEventListener('DOMContentLoaded', function() {
    const typeContainer = document.querySelector('footer p');
    if (!typeContainer) return;

    const speed = 50; // Typing speed in milliseconds
    const originalNodes = Array.from(typeContainer.childNodes);
    typeContainer.innerHTML = ''; // Clear the container

    let parentElement = typeContainer;

    async function typeWriter(nodes) {
        for (const node of nodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // It's an element (e.g., <b>, <i>, <br>)
                const newElement = document.createElement(node.nodeName);
                parentElement.appendChild(newElement);

                // If the element has children, recurse
                if (node.childNodes.length > 0) {
                    const oldParent = parentElement;
                    parentElement = newElement;
                    await typeWriter(Array.from(node.childNodes));
                    parentElement = oldParent; // Restore parent for sibling nodes
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                // It's a text node, type it out
                await typeText(node.textContent);
            }
        }
    }

    function typeText(text) {
        return new Promise(resolve => {
            let i = 0;
            function typeChar() {
                if (i < text.length) {
                    parentElement.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    resolve();
                }
            }
            typeChar();
        });
    }

    function addCursorAndBlink() {
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        cursor.textContent = '█';
        typeContainer.appendChild(cursor);

        let blinks = 0;
        const blinker = setInterval(() => {
            cursor.style.visibility = (cursor.style.visibility === 'hidden' ? 'visible' : 'hidden');
            blinks++;
            if (blinks > 8) { // 4 full blinks
                clearInterval(blinker);
                cursor.remove();
            }
        }, 500);
    }

    // Start the animation and add the cursor when it's done
    typeWriter(originalNodes).then(() => {
        addCursorAndBlink();
    });
});
