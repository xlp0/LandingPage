function getInput(target) {
    if (typeof target === 'string') return target;
    if (typeof target === 'object' && target !== null) {
        return target.__input_content__ || target.text || '';
    }
    return String(target);
}

const textInput = getInput(target).trim();
const result = textInput.split('').reverse().join('').toUpperCase();
result;
