import type { Meta, StoryObj } from "@storybook/react";
import type { ThemePreference } from "@/hooks/useTheme";
import { ThemeToggle } from "./ThemeToggle";

const THEME_STORAGE_KEY = "use-persistent-state-theme";

const meta: Meta<typeof ThemeToggle> = {
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <div className="rounded-md bg-shark-900 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

function withPreference(preference: ThemePreference): Story {
  return {
    args: {},
    decorators: [
      (Story) => {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
        return <Story key={preference} />;
      },
    ],
  };
}

export const Light: Story = withPreference("light");
export const Dark: Story = withPreference("dark");
export const System: Story = withPreference("system");
