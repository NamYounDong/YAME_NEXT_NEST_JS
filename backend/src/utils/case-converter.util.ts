/**
 * 케이스 변환 유틸리티
 * snake_case를 camelCase로 변환하는 기능을 제공합니다.
 */

export class CaseConverterUtil {
  /**
   * snake_case를 camelCase로 변환
   * @param str 변환할 문자열
   * @returns camelCase로 변환된 문자열
   */
  static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * 객체의 모든 키를 camelCase로 변환
   * @param obj 변환할 객체
   * @returns camelCase 키를 가진 객체
   */
  static convertKeysToCamelCase<T>(obj: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertKeysToCamelCase(item)) as T;
    }

    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const camelKey = this.toCamelCase(key);
          converted[camelKey] = this.convertKeysToCamelCase(obj[key]);
        }
      }
      return converted as T;
    }

    return obj;
  }

  /**
   * 배열의 모든 객체 키를 camelCase로 변환
   * @param arr 변환할 배열
   * @returns camelCase 키를 가진 객체들의 배열
   */
  static convertArrayKeysToCamelCase<T>(arr: any[]): T[] {
    return arr.map(item => this.convertKeysToCamelCase(item));
  }
}
