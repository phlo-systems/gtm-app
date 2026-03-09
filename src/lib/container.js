export const CONTAINERS = {
  '20ft': { name: '20ft Standard', length: 589, width: 234, height: 238, maxWeight: 21770, tare: 2230, cbm: 33.1 },
  '40ft': { name: '40ft Standard', length: 1203, width: 234, height: 238, maxWeight: 26480, tare: 3750, cbm: 67.5 },
  '40hc': { name: '40ft High Cube', length: 1203, width: 234, height: 269, maxWeight: 26280, tare: 3900, cbm: 76.2 },
  '20rf': { name: '20ft Reefer', length: 540, width: 228, height: 215, maxWeight: 20900, tare: 3100, cbm: 28.1 },
  '40rf': { name: '40ft Reefer', length: 1145, width: 228, height: 215, maxWeight: 26280, tare: 4800, cbm: 56.1 },
}

export const PALLETS = {
  'EUR': { name: 'Euro Pallet', length: 120, width: 80 },
  'US': { name: 'US Standard (48x40")', length: 121.9, width: 101.6 },
  'Asia': { name: 'Asia (1100x1100)', length: 110, width: 110 },
  'none': { name: 'No Pallet (loose)', length: 0, width: 0 },
}

function fitInArea(aL, aW, iL, iW) {
  return Math.max(Math.floor(aL/iL)*Math.floor(aW/iW), Math.floor(aL/iW)*Math.floor(aW/iL))
}

export function calculateContainerStuffing(p) {
  const ct = CONTAINERS[p.containerType||'40ft']
  const pt = PALLETS[p.palletType||'none']
  const usePallets = pt.length > 0
  const cL=p.cartonLength||60, cW=p.cartonWidth||40, cH=p.cartonHeight||40, cWt=p.cartonWeight||25
  const upc = p.unitsPerCarton||1, pH = p.palletHeight||15
  const cVol = (cL*cW*cH)/1000000

  if (usePallets) {
    const ppf = fitInArea(ct.length, ct.width, pt.length, pt.width)
    const maxH = ct.height - pH
    const cpp = fitInArea(pt.length, pt.width, cL, cW)
    const stacks = Math.floor(maxH/cH)
    const cartonsPerPallet = cpp * stacks
    const plH = pH + stacks*cH
    const layers = Math.floor(ct.height/plH)
    const totalPallets = ppf * layers
    let totalCartons = totalPallets * cartonsPerPallet
    const totalWt = totalCartons * cWt
    const weightLimited = totalWt > ct.maxWeight
    if (weightLimited) totalCartons = Math.floor(ct.maxWeight/cWt)
    const vol = totalCartons * cVol
    return { container: ct, method:'palletised', pallet: pt, palletsPerFloor: ppf, palletLayers: layers, totalPallets, cartonsPerPallet, cartonsPerPalletLayer: cpp, stacksPerPallet: stacks, palletLoadHeight: Math.round(plH), totalCartons, totalUnits: totalCartons*upc, totalWeight: Math.round(Math.min(totalWt,ct.maxWeight)), totalVolume: Math.round(vol*100)/100, volumeUtilisation: Math.round(Math.min(vol/ct.cbm*100,100)*10)/10, weightUtilisation: Math.round(Math.min(totalWt,ct.maxWeight)/ct.maxWeight*1000)/10, limitingFactor: weightLimited?'weight':'volume', weightLimited, wastedSpace: Math.round((ct.cbm-vol)*100)/100, suggestedQuantity: totalCartons*upc, suggestedCartons: totalCartons, cartonVolume: Math.round(cVol*10000)/10000 }
  } else {
    const cpl = fitInArea(ct.length, ct.width, cL, cW)
    const layers = Math.floor(ct.height/cH)
    let totalCartons = cpl * layers
    const totalWt = totalCartons * cWt
    const weightLimited = totalWt > ct.maxWeight
    if (weightLimited) totalCartons = Math.floor(ct.maxWeight/cWt)
    const vol = totalCartons * cVol
    return { container: ct, method:'loose', cartonsPerLayer: cpl, layers, totalCartons, totalUnits: totalCartons*upc, totalWeight: Math.round(Math.min(totalWt,ct.maxWeight)), totalVolume: Math.round(vol*100)/100, volumeUtilisation: Math.round(Math.min(vol/ct.cbm*100,100)*10)/10, weightUtilisation: Math.round(Math.min(totalWt,ct.maxWeight)/ct.maxWeight*1000)/10, limitingFactor: weightLimited?'weight':'volume', weightLimited, wastedSpace: Math.round((ct.cbm-vol)*100)/100, suggestedQuantity: totalCartons*upc, suggestedCartons: totalCartons, cartonVolume: Math.round(cVol*10000)/10000 }
  }
}

export function containersNeeded(totalUnits, upc, stuffing) {
  const cn = Math.ceil(totalUnits/upc)
  const containers = Math.ceil(cn/stuffing.totalCartons)
  const lastCn = cn - (containers-1)*stuffing.totalCartons
  return { totalUnits, cartonsNeeded: cn, containers, fullContainers: containers-1, lastContainerCartons: lastCn, lastContainerUtilisation: Math.round(lastCn/stuffing.totalCartons*100), optimisedQuantity: containers*stuffing.totalUnits, waste: containers*stuffing.totalUnits - totalUnits }
}
