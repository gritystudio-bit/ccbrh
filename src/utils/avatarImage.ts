/**
 * Redimensiona e recorta centralizado uma imagem para um avatar quadrado nítido (320x320)
 * em formato Data URL otimizado (JPEG 86%), garantindo carregamento instantâneo e persistência
 * direta no banco sem expiração de URL assinada.
 */
export async function processAvatarImageFile(file: File, size = 320): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (.jpg, .png ou .webp).');
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 12 MB.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível processar esta imagem.'));
    element.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return dataUrl;
  }

  // Center-crop square
  const minSide = Math.min(img.width, img.height);
  const sx = Math.max(0, (img.width - minSide) / 2);
  const sy = Math.max(0, (img.height - minSide) / 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

  return canvas.toDataURL('image/jpeg', 0.86);
}
