// https://dynalist.io/d/eWca1RrxFPY5evUFXQ0n9xOw#z=eMqRIA-SWKHsHeVBz7Q9mexB
export function getIDFromURL(url: string) {
  const regexp = /https:\/\/dynalist.io\/d\/.+\#z=([\w-_]+)/
  const result = regexp.exec(url)

  return result ? result[1] : undefined
}

export function getURLFromID(fileID: string, nodeID: string) {
  return `https://dynalist.io/d/${fileID}#z=${nodeID}`
}
