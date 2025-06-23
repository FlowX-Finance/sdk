export function removeEmptyFields(data: any): any {
  if (Array.isArray(data)) {
    // For arrays: remove empty elements recursively
    return data
      .map((item) => removeEmptyFields(item))
      .filter((element) => {
        return element !== null && element !== undefined && element !== '';
      });
  } else if (typeof data === 'object' && data !== null) {
    // For objects: recursively remove empty fields
    const newObj: any = {};
    Object.keys(data).forEach((key) => {
      const cleanedValue = removeEmptyFields(data[key]);
      if (
        cleanedValue !== null &&
        cleanedValue !== undefined &&
        cleanedValue !== ''
      ) {
        newObj[key] = cleanedValue;
      }
    });
    return newObj;
  } else {
    // Return data as is for other types (numbers, strings, etc.) and null values
    return data;
  }
}
