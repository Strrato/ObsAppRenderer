
export function satanize(input) {
    return input.replace(/[^A-z0-9_:\-àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ]/g, '');
}

export function defined(variable) {
    return typeof variable !== typeof void(0);
}