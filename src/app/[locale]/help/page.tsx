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
          <Step number={4} title={t("gettingStarted.step4Title")} body={t("gettingStarted.step4Body")} />
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
          <Card title={t("relationships.parentTitle")} body={t("relationships.parentBody")} />
          <Card title={t("relationships.filterTitle")} body={t("relationships.filterBody")} />
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
          <Card title={t("familyTree.mediaLibraryTitle")} body={t("familyTree.mediaLibraryBody")} />
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
          <Card title={t("lifeStory.lifeImageTitle")} body={t("lifeStory.lifeImageBody")} />
          <Card title={t("lifeStory.exportPdfTitle")} body={t("lifeStory.exportPdfBody")} />
          <Card title={t("lifeStory.mediaLibraryTitle")} body={t("lifeStory.mediaLibraryBody")} />
        </Cards>
      </Section>

      <Section title={t("lifeEvents.title")} icon="📅">
        <Cards>
          <Card title={t("lifeEvents.overviewTitle")} body={t("lifeEvents.overviewBody")} />
          <Card title={t("lifeEvents.timelineTitle")} body={t("lifeEvents.timelineBody")} />
          <Card title={t("lifeEvents.addingTitle")} body={t("lifeEvents.addingBody")} />
          <Card title={t("lifeEvents.viewingTitle")} body={t("lifeEvents.viewingBody")} />
          <Card title={t("lifeEvents.editingTitle")} body={t("lifeEvents.editingBody")} />
          <Card title={t("lifeEvents.sourcesTitle")} body={t("lifeEvents.sourcesBody")} />
        </Cards>
      </Section>

      <Section title={t("research.title")} icon="📝">
        <Cards>
          <Card title={t("research.overviewTitle")} body={t("research.overviewBody")} />
          <Card title={t("research.notesTitle")} body={t("research.notesBody")} />
          <Card title={t("research.editingTitle")} body={t("research.editingBody")} />
          <Card title={t("research.wikiTitle")} body={t("research.wikiBody")} />
          <Card title={t("research.censusTitle")} body={t("research.censusBody")} />
          <Card title={t("research.censusAttributionTitle")} body={t("research.censusAttributionBody")} />
        </Cards>
      </Section>

      <Section title={t("aiAssistant.title")} icon="🤖">
        <Cards>
          <Card title={t("aiAssistant.overviewTitle")} body={t("aiAssistant.overviewBody")} />
          <Card title={t("aiAssistant.setupTitle")} body={t("aiAssistant.setupBody")} />
          <Card title={t("aiAssistant.providersTitle")} body={t("aiAssistant.providersBody")} />
          <Card title={t("aiAssistant.startingTitle")} body={t("aiAssistant.startingBody")} />
          <Card title={t("aiAssistant.templatesTitle")} body={t("aiAssistant.templatesBody")} />
          <Card title={t("aiAssistant.personContextTitle")} body={t("aiAssistant.personContextBody")} />
          <Card title={t("aiAssistant.treeContextTitle")} body={t("aiAssistant.treeContextBody")} />
          <Card title={t("aiAssistant.saveTitle")} body={t("aiAssistant.saveBody")} />
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

      <Section title={t("gedcom.title")} icon="🔗">
        <Cards>
          <Card title={t("gedcom.whatTitle")} body={t("gedcom.whatBody")} />
          <Card title={t("gedcom.exportTitle")} body={t("gedcom.exportBody")} />
          <Card title={t("gedcom.importTitle")} body={t("gedcom.importBody")} />
          <Card title={t("gedcom.warningsTitle")} body={t("gedcom.warningsBody")} />
          <Card title={t("gedcom.includedTitle")} body={t("gedcom.includedBody")} />
          <Card title={t("gedcom.compatTitle")} body={t("gedcom.compatBody")} />
        </Cards>
      </Section>

      <Section title={t("contactUs.title")} icon="✉️">
        <Cards>
          <ContactCard title={t("contactUs.supportTitle")} body={t("contactUs.supportBody")} email="support@ullav.com" color="text-emerald-700" />
          <ContactCard title={t("contactUs.contactTitle")} body={t("contactUs.contactBody")} email="info@ullav.com" color="text-emerald-700" />
          <ContactCard title={t("contactUs.accountTitle")} body={t("contactUs.accountBody")} email="support@ullav.com" color="text-emerald-700" />
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

function ContactCard({ title, body, email, color }: { title: string; body: string; email: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="font-semibold text-stone-800 text-sm mb-1">{title}</p>
      <p className="text-stone-500 text-sm leading-relaxed mb-2">{body}</p>
      <a href={`mailto:${email}`} className={`text-sm font-medium ${color} hover:underline`}>{email}</a>
    </div>
  );
}
