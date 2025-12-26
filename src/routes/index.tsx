import { createFileRoute, redirect } from "@tanstack/react-router";

const Home = () => {
  return <></>;
};

export const Route = createFileRoute("/")({
  component: Home,
  beforeLoad: () => {
    throw redirect({
      to: "/home",
      replace: true, 
    });
  },
});
