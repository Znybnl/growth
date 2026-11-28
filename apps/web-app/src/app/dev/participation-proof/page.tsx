import { notFound } from "next/navigation";
import { ParticipationFixture } from "../../../../e2e/fixtures/participation";
export const metadata = {robots:{index:false,follow:false}};
export default async function Page({searchParams}:{
  searchParams:Promise<{preview?:string;mechanic?:string;marketing?:string;template?:string}>;
}) {
  if(process.env.NODE_ENV !== "development") notFound();
  const params=await searchParams;
  return <ParticipationFixture preview={params.preview==="1"} mechanic={params.mechanic==="wheel"?"wheel":"scratch"} marketing={params.marketing==="1"} template={params.template==="classic"?"classic":undefined} />;
}
