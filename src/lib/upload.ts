export type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

/**
 * React Native'in FormData'sı dosyaları { uri, name, type } nesnesi olarak kabul eder;
 * DOM'un FormData tipi bunu bilmediği için tek tip dönüşümü burada yapılır.
 */
export function appendFile(form: FormData, field: string, file: UploadFile): void {
  form.append(field, file as unknown as Blob);
}
