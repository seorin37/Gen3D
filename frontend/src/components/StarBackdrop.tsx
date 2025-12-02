// src/components/StarBackdrop.tsx
import bg from "../assets/space-bg.jpg"; // 파일 이름/확장자에 맞게 수정

/**
 * StarBackdrop — 이미지 배경 버전
 */
export default function StarBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <img
        src={bg}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );
}
