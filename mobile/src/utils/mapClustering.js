import { Dimensions } from "react-native";
import Supercluster from "supercluster";

export const UK_OVERVIEW_REGION = {
  latitude: 54.0,
  longitude: -2.5,
  latitudeDelta: 9.0,
  longitudeDelta: 9.0,
};

const MAX_LEAF_MARKERS = 150;

const CLUSTER_OPTIONS = {
  radius: 60,
  maxZoom: 18,
  minPoints: 2,
  map: (props) => ({
    played: props.user_played ? 1 : 0,
    wishlisted: props.user_wishlisted ? 1 : 0,
  }),
  reduce: (acc, props) => {
    acc.played = (acc.played || 0) + (props.played || 0);
    acc.wishlisted = (acc.wishlisted || 0) + (props.wishlisted || 0);
  },
};

function hasValidCoords(course) {
  const lat = Number(course?.latitude);
  const lng = Number(course?.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

export function coursesToGeoJSON(courses) {
  return (courses ?? [])
    .filter(hasValidCoords)
    .map((course) => ({
      type: "Feature",
      properties: {
        courseId: course.id,
        user_played: !!course.user_played,
        user_wishlisted: !!course.user_wishlisted,
      },
      geometry: {
        type: "Point",
        coordinates: [Number(course.longitude), Number(course.latitude)],
      },
    }));
}

export function createCourseClusterIndex(courses) {
  const index = new Supercluster(CLUSTER_OPTIONS);
  index.load(coursesToGeoJSON(courses));
  return index;
}

export function normalizeMapRegion(region) {
  const fallback = UK_OVERVIEW_REGION;
  const latitude = Number(region?.latitude);
  const longitude = Number(region?.longitude);
  const latitudeDelta = Number(region?.latitudeDelta);
  const longitudeDelta = Number(region?.longitudeDelta);

  return {
    latitude: Number.isFinite(latitude) ? latitude : fallback.latitude,
    longitude: Number.isFinite(longitude) ? longitude : fallback.longitude,
    latitudeDelta:
      Number.isFinite(latitudeDelta) && latitudeDelta > 0
        ? latitudeDelta
        : fallback.latitudeDelta,
    longitudeDelta:
      Number.isFinite(longitudeDelta) && longitudeDelta > 0
        ? longitudeDelta
        : fallback.longitudeDelta,
  };
}

/** Round region values so tiny map gestures do not trigger full reclustering. */
export function quantizeMapRegion(region, precision = 4) {
  const normalized = normalizeMapRegion(region);
  const factor = 10 ** precision;
  return {
    latitude: Math.round(normalized.latitude * factor) / factor,
    longitude: Math.round(normalized.longitude * factor) / factor,
    latitudeDelta: Math.round(normalized.latitudeDelta * factor) / factor,
    longitudeDelta: Math.round(normalized.longitudeDelta * factor) / factor,
  };
}

export function regionsEqual(a, b, precision = 4) {
  const qa = quantizeMapRegion(a, precision);
  const qb = quantizeMapRegion(b, precision);
  return (
    qa.latitude === qb.latitude &&
    qa.longitude === qb.longitude &&
    qa.latitudeDelta === qb.latitudeDelta &&
    qa.longitudeDelta === qb.longitudeDelta
  );
}

export function regionToBBox(region) {
  const normalized = normalizeMapRegion(region);
  return [
    normalized.longitude - normalized.longitudeDelta / 2,
    normalized.latitude - normalized.latitudeDelta / 2,
    normalized.longitude + normalized.longitudeDelta / 2,
    normalized.latitude + normalized.latitudeDelta / 2,
  ];
}

export function regionToZoom(
  region,
  mapWidth = Dimensions.get("window").width,
) {
  const normalized = normalizeMapRegion(region);
  const width = Number.isFinite(mapWidth) && mapWidth > 0 ? mapWidth : 360;
  const zoom = Math.floor(
    Math.log((360 * width) / (256 * normalized.longitudeDelta)) / Math.LN2,
  );
  if (!Number.isFinite(zoom)) return 10;
  return Math.max(0, Math.min(20, zoom));
}

export function getMapClusters(index, region) {
  if (!index) return [];
  try {
    const bbox = regionToBBox(region);
    const zoom = regionToZoom(region);
    if (!Number.isFinite(zoom)) return [];
    const features = index.getClusters(bbox, zoom);
    const clusters = features.filter((feature) => feature.properties.cluster);
    const leaves = features.filter((feature) => !feature.properties.cluster);
    if (leaves.length <= MAX_LEAF_MARKERS) {
      return features;
    }
    return [...clusters, ...leaves.slice(0, MAX_LEAF_MARKERS)];
  } catch {
    return [];
  }
}

export function getClusterStyle(clusterProperties) {
  if (clusterProperties?.played > 0) {
    return { bg: "#2C6E49", border: "#1B4D35" };
  }
  if (clusterProperties?.wishlisted > 0) {
    return { bg: "#C9A84C", border: "#A8843A" };
  }
  return { bg: "#1B3828", border: "#0E1E15" };
}

/** Region to zoom into when a cluster badge is tapped. */
export function getClusterZoomRegion(index, clusterFeature) {
  const clusterId = clusterFeature?.properties?.cluster_id;
  const [lng, lat] = clusterFeature?.geometry?.coordinates ?? [0, 0];
  if (!index || clusterId == null) {
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 2,
      longitudeDelta: 2,
    };
  }
  try {
    const expansionZoom = Math.min(
      index.getClusterExpansionZoom(clusterId),
      18,
    );
    const delta = 360 / Math.pow(2, expansionZoom);
    return normalizeMapRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: delta,
      longitudeDelta: delta,
    });
  } catch {
    return normalizeMapRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 2,
      longitudeDelta: 2,
    });
  }
}
