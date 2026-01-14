function getInput(target) {
    if (typeof target === 'string') return target;
    if (typeof target === 'object' && target !== null) {
        return target.__input_content__ || target.numbers || '';
    }
    return String(target);
}

const inputStr = getInput(target);
const numbers = inputStr.trim().split(',').map(x => parseFloat(x.trim()));
const result = numbers.reduce((a, b) => a + b, 0);
result;
