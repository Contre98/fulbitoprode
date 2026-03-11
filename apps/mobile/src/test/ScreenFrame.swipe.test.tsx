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
});
