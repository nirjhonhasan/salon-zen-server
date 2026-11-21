// Check that an id from the URL looks like a MongoDB id (24 hex characters).
export function isValidId(id) {
    return /^[a-f\d]{24}$/i.test(id)
}
