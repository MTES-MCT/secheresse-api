import gdal from 'gdal-async'

const zonesDs = gdal.open('./data/all_zones.shp.zip')
const zonesLayer = zonesDs.layers.get(0)
const communesDs = gdal.open('./data/communes-50m.geojson')
const communesLayer = communesDs.layers.get(0)

const zonesFeaturesIndex = new Map()

for (const zoneFeature of zonesLayer.features) {
  const idZone = zoneFeature.fields.get('id_zone').toString()
  zonesFeaturesIndex.set(idZone, zoneFeature)
}

const communesFeaturesByDep = new Map()

for (const communeFeature of communesLayer.features) {
  const departement = communeFeature.fields.get('departement')

  if (!communesFeaturesByDep.has(departement)) {
    communesFeaturesByDep.set(departement, [])
  }

  communesFeaturesByDep.get(departement).push(communeFeature)
}

const MIN_AREA_SIZE_IN_SQ_DEGREES = 0.000_090_42 // 10ha

export function computeCommunes(zone) {
  const zoneGeometry = getZoneGeometry(zone.idZone)

  if (!zoneGeometry) {
    return
  }

  const {departement} = zone
  const communesFeatures = communesFeaturesByDep.get(departement)

  return communesFeatures
    .filter(feature => {
      try {
        const intersectionGeom = feature.getGeometry().intersection(zoneGeometry)

        if (!intersectionGeom) {
          return false
        }

        const area = intersectionGeom.getArea()
        return area > MIN_AREA_SIZE_IN_SQ_DEGREES
      } catch {
        return feature.getGeometry().intersects(zoneGeometry)
      }
    })
    .map(feature => feature.fields.get('code'))
}

export function getZoneGeometry(idZone, convertToGeoJSON = false) {
  const zoneFeature = zonesFeaturesIndex.get(idZone)

  if (!zoneFeature) {
    console.log(`Contour de la zone ${idZone} non trouvé`)
    return
  }

  const zoneGeometry = zoneFeature.getGeometry()

  if (!zoneGeometry) {
    console.log('No geometry for id ' + idZone)
    return
  }

  return convertToGeoJSON ? zoneGeometry.toObject() : zoneGeometry
}

export function destroyContext() {
  zonesDs.close()
  communesDs.close()
}
