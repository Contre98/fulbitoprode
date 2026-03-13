import { fireEvent, render } from "@testing-library/react-native";
import { ScreenFrame } from "@/components/ScreenFrame";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

jest.mock("@/components/DataModeBadge", () => ({
  DataModeBadge: () => null
}));

describe("ScreenFrame swipe handlers", () => {
  it("triggers onSwipeLeft for horizontal left swipe", () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();
    const screen = render(
      <ScreenFrame title="Test" onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        {null}
      </ScreenFrame>
    );

    const scroll = screen.getByTestId("screenframe-scroll");
    fireEvent(scroll, "touchStart", { nativeEvent: { pageX: 240, pageY: 120, timestamp: 100 } });
    fireEvent(scroll, "touchEnd", { nativeEvent: { pageX: 140, pageY: 126, timestamp: 260 } });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("triggers onSwipeRight for horizontal right swipe", () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();
    const screen = render(
      <ScreenFrame title="Test" onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        {null}
      </ScreenFrame>
    );

    const scroll = screen.getByTestId("screenframe-scroll");
    fireEvent(scroll, "touchStart", { nativeEvent: { pageX: 120, pageY: 200, timestamp: 100 } });
    fireEvent(scroll, "touchEnd", { nativeEvent: { pageX: 220, pageY: 202, timestamp: 250 } });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores mostly vertical movement", () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();
    const screen = render(
      <ScreenFrame title="Test" onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight}>
        {null}
      </ScreenFrame>
    );

    const scroll = screen.getByTestId("screenframe-scroll");
    fireEvent(scroll, "touchStart", { nativeEvent: { pageX: 180, pageY: 100, timestamp: 100 } });
    fireEvent(scroll, "touchEnd", { nativeEvent: { pageX: 188, pageY: 240, timestamp: 280 } });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("renders swipe cue arrows only when enabled", () => {
    const screen = render(
      <ScreenFrame title="Test" onSwipeLeft={jest.fn()} onSwipeRight={jest.fn()} showSwipeCue>
        {null}
      </ScreenFrame>
    );

    expect(screen.getByText("←")).toBeTruthy();
    expect(screen.getByText("→")).toBeTruthy();
  });

  it("does not render swipe cue arrows by default", () => {
    const screen = render(
      <ScreenFrame title="Test" onSwipeLeft={jest.fn()} onSwipeRight={jest.fn()}>
        {null}
      </ScreenFrame>
    );

    expect(screen.queryByText("←")).toBeNull();
    expect(screen.queryByText("→")).toBeNull();
  });

  it("blocks vertical scrolling while a horizontal swipe is active", () => {
    const screen = render(
      <ScreenFrame title="Test" onSwipeLeft={jest.fn()} onSwipeRight={jest.fn()}>
        {null}
      </ScreenFrame>
    );

    const scroll = screen.getByTestId("screenframe-scroll");
    expect(scroll.props.scrollEnabled).toBe(true);

    fireEvent(scroll, "touchStart", { nativeEvent: { pageX: 220, pageY: 120, timestamp: 100 } });
    fireEvent(scroll, "touchMove", { nativeEvent: { pageX: 150, pageY: 124, timestamp: 140 } });
    expect(screen.getByTestId("screenframe-scroll").props.scrollEnabled).toBe(false);

    fireEvent(scroll, "touchEnd", { nativeEvent: { pageX: 120, pageY: 126, timestamp: 230 } });
    expect(screen.getByTestId("screenframe-scroll").props.scrollEnabled).toBe(true);
  });
});
