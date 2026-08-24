import { useMemo } from "react";
import {
  createCourseClusterIndex,
  getMapClusters,
} from "@/utils/mapClustering";

/**
 * Builds a supercluster index and returns visible cluster/leaf features for the map region.
 */
export function useMapClusters(courses, region) {
  const clusterIndex = useMemo(
    () => createCourseClusterIndex(courses ?? []),
    [courses],
  );

  const courseById = useMemo(() => {
    const map = new Map();
    for (const course of courses ?? []) {
      if (course?.id != null) {
        map.set(course.id, course);
        map.set(String(course.id), course);
      }
    }
    return map;
  }, [courses]);

  const clusters = useMemo(
    () => getMapClusters(clusterIndex, region),
    [clusterIndex, region],
  );

  return { clusters, clusterIndex, courseById };
}
