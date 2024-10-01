import { OrganizationSwitcher, UserButton } from "@clerk/clerk-react";

export default function Nav() {
  return (
    <nav className="bg-gradient-to-r from-black to-gray-800 shadow w-full">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img alt="Clerk" src="/clerk.svg" className="h-8 w-auto" />
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                <a
                  href="/"
                  className="rounded-md bg-purple-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Home
                </a>
              </div>
            </div>
          </div>
          <div className={"flex gap-3"}>
            <OrganizationSwitcher
              appearance={{
                variables: {
                  colorText: "#ffffff",
                  colorBackground: "black",
                  colorTextOnPrimaryBackground: "white",
                  colorInputText: "white",
                  colorTextSecondary: "white",
                  colorNeutral: "white",
                },
              }}
              createOrganizationUrl={""}
              organizationProfileUrl={""}
            />
            <UserButton
              appearance={{
                variables: {
                  colorText: "#ffffff",
                  colorBackground: "black",
                  colorTextOnPrimaryBackground: "white",
                  colorInputText: "white",
                  colorTextSecondary: "white",
                  colorNeutral: "white",
                },
              }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
