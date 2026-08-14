/**
 * /communities route — redirect to the tab navigator
 */
import { Redirect } from "expo-router";

export default function CommunitiesIndex() {
  return <Redirect href="/(tabs)/communities" />;
}
