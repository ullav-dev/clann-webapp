import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function HelpPage() {
  const t = await getTranslations("help");

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">{t("title")}</h1>
        <p className="text-stone-500">{t("subtitle")}</p>
      </div>

      <Section title={t("gettingStarted.title")} icon="🚀">
        <Steps>
          <Step number={1} title={t("gettingStarted.step1Title")} body={t("gettingStarted.step1Body")} />
          <Step number={2} title={t("gettingStarted.step2Title")} body={t("gettingStarted.step2Body")} />
          <Step number={3} title={t("gettingStarted.step3Title")} body={t("gettingStarted.step3Body")} />
        </Steps>
      </Section>

      <Section title={t("people.title")} icon="👤">
        <Cards>
          <Card title={t("people.fieldsTitle")} body={t("people.fieldsBody")} />
          <Card title={t("people.photoTitle")} body={t("people.photoBody")} />
          <Card title={t("people.editTitle")} body={t("people.editBody")} />
        </Cards>
      </Section>

      <Section title={t("relationships.title")} icon="👥">
        <Cards>
          <Card title={t("relationships.typesTitle")} body={t("relationships.typesBody")} />
          <Card title={t("relationships.siblingTitle")} body={t("relationships.siblingBody")} />
          <Card title={t("relationships.spouseTitle")} body={t("relationships.spouseBody")} />
        </Cards>
      </Section>

      <Section title={t("familyTree.title")} icon="🌳">
        <Cards>
          <Card title={t("familyTree.overviewTitle")} body={t("familyTree.overviewBody")} />
          <Card title={t("familyTree.coloursTitle")} body={t("familyTree.coloursBody")} />
          <Card title={t("familyTree.navigationTitle")} body={t("familyTree.navigationBody")} />
          <Card title={t("familyTree.orientationTitle")} body={t("familyTree.orientationBody")} />
          <Card title={t("familyTree.exportTitle")} body={t("familyTree.exportBody")} />
        </Cards>
      </Section>

      <Section title={t("familyList.title")} icon="📋">
        <Cards>
          <Card title={t("familyList.viewsTitle")} body={t("familyList.viewsBody")} />
          <Card title={t("familyList.searchTitle")} body={t("familyList.searchBody")} />
          <Card title={t("familyList.paginationTitle")} body={t("familyList.paginationBody")} />
        </Cards>
      </Section>

      <Section title={t("lifeStory.title")} icon="📖">
        <Cards>
          <Card title={t("lifeStory.overviewTitle")} body={t("lifeStory.overviewBody")} />
          <Card title={t("lifeStory.editingTitle")} body={t("lifeStory.editingBody")} />
          <Card title={t("lifeStory.markdownTitle")} body={t("lifeStory.markdownBody")} />
        </Cards>
      </Section>

      <Section title={t("multipleTrees.title")} icon="🌲">
        <Cards>
          <Card title={t("multipleTrees.manageTitle")} body={t("multipleTrees.manageBody")} />
          <Card title={t("multipleTrees.primaryTitle")} body={t("multipleTrees.primaryBody")} />
          <Card title={t("multipleTrees.exportTitle")} body={t("multipleTrees.exportBody")} />
          <Card title={t("multipleTrees.importTitle")} body={t("multipleTrees.importBody")} />
        </Cards>
      </Section>

      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-5 flex items-center justify-between gap-4">
        <p className="text-emerald-800 text-sm">{t("cta")}</p>
        <Link
          href="/family"
          className="shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function Step({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="flex gap-4 bg-white rounded-xl border border-stone-200 p-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">
        {number}
      </div>
      <div>
        <p className="font-semibold text-stone-800 text-sm mb-1">{title}</p>
        <p className="text-stone-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Cards({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="font-semibold text-stone-800 text-sm mb-1">{title}</p>
      <p className="text-stone-500 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
